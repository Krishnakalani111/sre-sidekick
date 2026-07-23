/**
 * EvidenceCollector — accumulates raw MCP `ToolResult[]` into a structured,
 * LLM-ready `Evidence` bundle, and produces a compact text digest for prompts.
 *
 * MCP tool outputs are dynamic (the SigNoz server owns the schemas), so parsing
 * is strictly best-effort: we always keep the full audit trail (`toolCalls`) and
 * render `ToolResult.text`/`data`, and we additionally populate the typed buckets
 * (services / traces / logs / metrics / fields) whenever a result is recognizably
 * one of those shapes.
 */
import type {
  Alert,
  Evidence,
  FieldInfo,
  LogRecord,
  MetricPoint,
  MetricSeries,
  PlannerDecision,
  ServiceSummary,
  TimeWindow,
  TimelineEvent,
  ToolResult,
  TraceErrorSpan,
  TraceSummary,
} from "@sre/types";

type Json = Record<string, unknown>;

const DEFAULT_LOOKBACK_MS = 15 * 60 * 1000;
const MAX_LOGS = 40;
const MAX_TRACES = 25;
const MAX_DIGEST_TEXT = 600;

function isObject(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function asNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}
function asStr(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}
function firstKey(o: Json, keys: string[]): unknown {
  for (const k of keys) if (k in o && o[k] != null) return o[k];
  return undefined;
}
function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n) + "…";
}

/**
 * Find candidate record arrays inside an arbitrary parsed tool result. MCP tools
 * variously return a bare array, `{ result: [...] }`, `{ data: [...] }`, etc.
 */
function collectArrays(data: unknown, depth = 0): unknown[][] {
  if (depth > 3) return [];
  if (Array.isArray(data)) return [data];
  if (!isObject(data)) return [];
  const out: unknown[][] = [];
  for (const v of Object.values(data)) {
    if (Array.isArray(v)) out.push(v);
    else if (isObject(v)) out.push(...collectArrays(v, depth + 1));
  }
  return out;
}

function toMs(v: unknown): number | undefined {
  const n = asNum(v);
  if (n !== undefined) {
    if (n > 1e18) return Math.round(n / 1e6); // nanos
    if (n > 1e15) return Math.round(n / 1e3); // micros
    if (n < 1e12) return Math.round(n * 1000); // seconds
    return Math.round(n); // millis
  }
  const s = asStr(v);
  if (s) {
    const p = Date.parse(s);
    if (!Number.isNaN(p)) return p;
  }
  return undefined;
}

// ---- shape recognizers -----------------------------------------------------

function recordLooksLikeService(o: Json): boolean {
  const hasName = firstKey(o, ["serviceName", "service", "name", "service.name"]) != null;
  const hasMetric =
    firstKey(o, ["errorRate", "errorRatePct", "p99", "p99Ms", "latencyP99", "rps", "callRate"]) !=
    null;
  return hasName && hasMetric;
}
function toService(o: Json): ServiceSummary {
  const errRaw = asNum(firstKey(o, ["errorRatePct", "errorRate", "error_rate"])) ?? 0;
  return {
    name: asStr(firstKey(o, ["serviceName", "service", "name", "service.name"])) ?? "unknown",
    errorRatePct: errRaw > 0 && errRaw <= 1 ? errRaw * 100 : errRaw,
    p99Ms: asNum(firstKey(o, ["p99Ms", "p99", "latencyP99", "p99_latency"])) ?? 0,
    rps: asNum(firstKey(o, ["rps", "callRate", "requestRate", "throughput"])) ?? 0,
  };
}

function recordLooksLikeTrace(o: Json): boolean {
  return firstKey(o, ["traceId", "traceID", "trace_id"]) != null;
}
function toTrace(o: Json): TraceSummary {
  const errorSpans: TraceErrorSpan[] = [];
  const spansRaw = firstKey(o, ["errorSpans", "spans", "errors"]);
  if (Array.isArray(spansRaw)) {
    for (const s of spansRaw) {
      if (!isObject(s)) continue;
      const status = asStr(firstKey(s, ["statusCode", "status", "spanStatus"]));
      const isError =
        firstKey(s, ["exceptionType", "exceptionMessage"]) != null ||
        (status ? /error|2|fail/i.test(status) : false);
      if (!isError && spansRaw !== firstKey(o, ["errorSpans", "errors"])) continue;
      errorSpans.push({
        service: asStr(firstKey(s, ["serviceName", "service", "name"])) ?? "unknown",
        operation: asStr(firstKey(s, ["operation", "name", "spanName"])) ?? "unknown",
        statusCode: status,
        statusMessage: asStr(firstKey(s, ["statusMessage", "message"])),
        exceptionType: asStr(firstKey(s, ["exceptionType", "exception.type"])),
        exceptionMessage: asStr(firstKey(s, ["exceptionMessage", "exception.message"])),
      });
    }
  }
  return {
    traceId: asStr(firstKey(o, ["traceId", "traceID", "trace_id"])) ?? "unknown",
    rootService: asStr(firstKey(o, ["rootService", "serviceName", "service"])) ?? "unknown",
    rootOperation: asStr(firstKey(o, ["rootOperation", "operation", "name"])) ?? "unknown",
    durationMs: asNum(firstKey(o, ["durationMs", "duration", "durationNano"])) ?? 0,
    spanCount: asNum(firstKey(o, ["spanCount", "spans"])) ?? errorSpans.length,
    hasError:
      Boolean(firstKey(o, ["hasError", "error"])) || errorSpans.length > 0,
    errorSpans,
    startTimeMs: toMs(firstKey(o, ["startTimeMs", "startTime", "timestamp"])) ?? 0,
  };
}

function recordLooksLikeLog(o: Json): boolean {
  const hasBody = firstKey(o, ["body", "message", "msg", "log"]) != null;
  const hasTs = firstKey(o, ["timestamp", "timestampMs", "time", "ts"]) != null;
  const hasSev = firstKey(o, ["severity", "severityText", "level"]) != null;
  return hasBody && (hasTs || hasSev);
}
function toLog(o: Json): LogRecord {
  const attrs = firstKey(o, ["attributes", "attributes_string", "resources"]);
  const record: LogRecord = {
    timestampMs: toMs(firstKey(o, ["timestampMs", "timestamp", "time", "ts"])) ?? 0,
    service: asStr(firstKey(o, ["service", "serviceName", "service.name"])) ?? "unknown",
    severity: asStr(firstKey(o, ["severity", "severityText", "level"])) ?? "info",
    body: asStr(firstKey(o, ["body", "message", "msg", "log"])) ?? "",
  };
  const traceId = asStr(firstKey(o, ["traceId", "trace_id"]));
  const spanId = asStr(firstKey(o, ["spanId", "span_id"]));
  if (traceId) record.traceId = traceId;
  if (spanId) record.spanId = spanId;
  if (isObject(attrs)) {
    const clean: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") clean[k] = v;
    }
    if (Object.keys(clean).length > 0) record.attributes = clean;
  }
  return record;
}

function recordLooksLikeMetric(o: Json): boolean {
  const hasName = firstKey(o, ["metric", "metricName", "queryName", "legend"]) != null;
  const hasValues = firstKey(o, ["points", "values", "series", "data"]) != null;
  return hasName && hasValues;
}
function toMetric(o: Json): MetricSeries {
  const points: MetricPoint[] = [];
  const raw = firstKey(o, ["points", "values", "data"]);
  if (Array.isArray(raw)) {
    for (const p of raw) {
      if (Array.isArray(p) && p.length >= 2) {
        const ts = toMs(p[0]);
        const val = asNum(p[1]);
        if (ts !== undefined && val !== undefined) points.push({ tsMs: ts, value: val });
      } else if (isObject(p)) {
        const ts = toMs(firstKey(p, ["tsMs", "timestamp", "ts", "time"]));
        const val = asNum(firstKey(p, ["value", "val", "v"]));
        if (ts !== undefined && val !== undefined) points.push({ tsMs: ts, value: val });
      }
    }
  }
  return {
    metric: asStr(firstKey(o, ["metric", "metricName", "queryName", "legend"])) ?? "unknown",
    aggregation: asStr(firstKey(o, ["aggregation", "aggregateOperator", "agg"])) ?? "unknown",
    labels: (() => {
      const l = firstKey(o, ["labels", "tags"]);
      const out: Record<string, string> = {};
      if (isObject(l)) for (const [k, v] of Object.entries(l)) {
        const s = asStr(v);
        if (s !== undefined) out[k] = s;
      }
      return out;
    })(),
    points,
  };
}

function recordLooksLikeField(o: Json): boolean {
  return (
    firstKey(o, ["key", "name", "fieldName"]) != null &&
    firstKey(o, ["dataType", "type"]) != null &&
    firstKey(o, ["signal", "type"]) != null
  );
}
function toField(o: Json): FieldInfo | undefined {
  const signal = asStr(firstKey(o, ["signal"]));
  if (signal !== "traces" && signal !== "logs" && signal !== "metrics") return undefined;
  return {
    key: asStr(firstKey(o, ["key", "name", "fieldName"])) ?? "unknown",
    dataType: asStr(firstKey(o, ["dataType", "type"])) ?? "string",
    signal,
  };
}

// ---------------------------------------------------------------------------

export class EvidenceCollector {
  private readonly ev: Evidence;

  constructor(alert: Alert) {
    const fromMs = alert.startsAtMs - DEFAULT_LOOKBACK_MS;
    const toMsVal = alert.endsAtMs ?? Date.now();
    const window: TimeWindow = { fromMs, toMs: toMsVal };
    this.ev = {
      alert,
      window,
      services: [],
      traces: [],
      logs: [],
      metrics: [],
      fields: [],
      timeline: [
        {
          tsMs: alert.startsAtMs,
          kind: "alert",
          service: alert.service,
          summary: `Alert fired: ${alert.name} (${alert.severity})`,
          ref: alert.id,
        },
      ],
      toolCalls: [],
    };
  }

  /** Ingest one planner step's tool results, extracting typed evidence + audit. */
  add(results: ToolResult[], decision?: PlannerDecision): void {
    for (const r of results) {
      this.ev.toolCalls.push(r);
      const reason = decision?.toolCalls.find((c) => c.tool === r.tool)?.reason;
      this.ev.timeline.push({
        tsMs: Date.now(),
        kind: r.ok ? "note" : "error",
        service: this.ev.alert.service,
        summary: r.ok
          ? `Called ${r.tool}${reason ? ` — ${reason}` : ""}`
          : `Tool ${r.tool} failed: ${r.error ?? "unknown error"}`,
        ref: r.tool,
      });
      if (r.ok) this.ingestData(r.data);
    }
  }

  private ingestData(data: unknown): void {
    if (data == null) return;
    const arrays = collectArrays(data);
    // Include a top-level single object as a 1-element "array" candidate.
    if (isObject(data)) arrays.push([data]);

    for (const arr of arrays) {
      for (const item of arr) {
        if (!isObject(item)) continue;
        if (recordLooksLikeTrace(item)) {
          this.pushUnique(this.ev.traces, toTrace(item), (t) => t.traceId, MAX_TRACES);
        } else if (recordLooksLikeService(item)) {
          this.pushUnique(this.ev.services, toService(item), (s) => s.name, 200);
        } else if (recordLooksLikeMetric(item)) {
          this.ev.metrics.push(toMetric(item));
        } else if (recordLooksLikeField(item)) {
          const f = toField(item);
          if (f) this.pushUnique(this.ev.fields, f, (x) => `${x.signal}:${x.key}`, 500);
        } else if (recordLooksLikeLog(item)) {
          if (this.ev.logs.length < MAX_LOGS) this.ev.logs.push(toLog(item));
        }
      }
    }

    // Timeline enrichment: surface error traces and error logs.
    for (const t of this.ev.traces) {
      if (t.hasError && t.errorSpans.length > 0) {
        const span = t.errorSpans[0];
        if (!this.ev.timeline.some((e) => e.ref === t.traceId)) {
          this.ev.timeline.push({
            tsMs: t.startTimeMs || Date.now(),
            kind: "error",
            service: span.service,
            summary: `Error trace: ${span.exceptionType ?? span.statusMessage ?? "failure"} in ${span.operation}`,
            ref: t.traceId,
          });
        }
      }
    }
  }

  private pushUnique<T>(
    bucket: T[],
    item: T,
    keyOf: (t: T) => string,
    cap: number,
  ): void {
    const key = keyOf(item);
    if (bucket.some((b) => keyOf(b) === key)) return;
    if (bucket.length >= cap) return;
    bucket.push(item);
  }

  evidence(): Evidence {
    return this.ev;
  }

  /** Compact, token-efficient text summary of everything gathered so far. */
  digest(): string {
    const e = this.ev;
    const lines: string[] = [];
    const a = e.alert;

    lines.push(`ALERT: ${a.name} [${a.severity}] source=${a.source}`);
    if (a.service) lines.push(`  service: ${a.service}`);
    if (a.description) lines.push(`  desc: ${truncate(a.description, 200)}`);
    if (a.threshold) {
      const t = a.threshold;
      lines.push(
        `  threshold: ${t.metric ?? "?"} ${t.op ?? ""} ${t.value ?? "?"} (observed ${t.observed ?? "?"})`,
      );
    }
    lines.push(
      `WINDOW: ${new Date(e.window.fromMs).toISOString()} -> ${new Date(e.window.toMs).toISOString()}`,
    );

    if (e.services.length) {
      lines.push("SERVICES:");
      for (const s of e.services.slice(0, 25)) {
        lines.push(
          `  - ${s.name}: err=${s.errorRatePct.toFixed(1)}% p99=${s.p99Ms}ms rps=${s.rps}`,
        );
      }
    }

    const errorTraces = e.traces.filter((t) => t.hasError);
    if (errorTraces.length) {
      lines.push(`ERROR TRACES (${errorTraces.length}):`);
      for (const t of errorTraces.slice(0, 10)) {
        const span = t.errorSpans[0];
        const exc = span
          ? `${span.exceptionType ?? span.statusCode ?? "error"}: ${truncate(span.exceptionMessage ?? span.statusMessage ?? "", 160)}`
          : "error";
        lines.push(
          `  - ${t.traceId} ${t.rootService}/${t.rootOperation} ${t.durationMs}ms — ${exc}`,
        );
      }
    }

    const notableLogs = e.logs
      .filter((l) => /err|warn|fatal|crit/i.test(l.severity))
      .slice(0, 15);
    const logsToShow = notableLogs.length ? notableLogs : e.logs.slice(0, 10);
    if (logsToShow.length) {
      lines.push("LOGS:");
      for (const l of logsToShow) {
        lines.push(`  [${l.severity}] ${l.service}: ${truncate(l.body, 160)}`);
      }
    }

    if (e.metrics.length) {
      lines.push("METRICS:");
      for (const m of e.metrics.slice(0, 15)) {
        const vals = m.points.map((p) => p.value);
        if (vals.length === 0) {
          lines.push(`  - ${m.metric} (${m.aggregation}): no points`);
          continue;
        }
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const last = vals[vals.length - 1];
        lines.push(
          `  - ${m.metric} (${m.aggregation}): min=${min} max=${max} last=${last} n=${vals.length}`,
        );
      }
    }

    lines.push(`TOOL CALLS (${e.toolCalls.length}):`);
    for (const r of e.toolCalls) {
      const status = r.ok ? "ok" : `ERROR(${r.error ?? "?"})`;
      const preview = r.ok && r.text ? ` :: ${truncate(r.text.replace(/\s+/g, " "), MAX_DIGEST_TEXT)}` : "";
      lines.push(`  - ${r.tool} [${status}] ${r.latencyMs}ms ${r.source}${preview}`);
    }

    if (e.services.length + e.traces.length + e.logs.length + e.metrics.length === 0) {
      lines.push("(no structured evidence extracted yet)");
    }

    return lines.join("\n");
  }
}

export default EvidenceCollector;

/**
 * Normalize a flexible incoming webhook body into the canonical `Alert` shape.
 *
 * Supports:
 *  - a raw `Alert` (or partial thereof) posted directly,
 *  - Alertmanager-style payloads ({ alerts: [{ labels, annotations, ... }] }),
 *  - SigNoz-ish payloads ({ alert, ruleName, severity, ... }).
 *
 * Anything unrecognized still yields a valid Alert with best-effort fields.
 */
import { randomUUID } from "node:crypto";
import type { Alert, AlertThreshold, Severity } from "@sre/types";

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function normalizeSeverity(v: unknown): Severity {
  const s = str(v)?.toLowerCase();
  if (s === "critical" || s === "crit" || s === "p1" || s === "page") return "critical";
  if (s === "warning" || s === "warn" || s === "p2") return "warning";
  if (s === "info" || s === "information" || s === "p3" || s === "p4") return "info";
  return "warning";
}

/** Coerce an epoch (seconds or millis) or ISO string into epoch millis. */
function toMs(v: unknown): number | undefined {
  const n = num(v);
  if (n !== undefined) {
    // Heuristic: treat 10-digit values as seconds.
    return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
  }
  const s = str(v);
  if (s) {
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function toStringMap(v: unknown): Record<string, string> {
  if (!isObject(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    const s = str(val);
    if (s !== undefined) out[k] = s;
  }
  return out;
}

function extractThreshold(body: Json, labels: Record<string, string>): AlertThreshold | undefined {
  const t = isObject(body.threshold) ? (body.threshold as Json) : undefined;
  const metric = str(t?.metric) ?? str(body.metric) ?? labels.metric;
  const op = str(t?.op) ?? str(body.op);
  const value = num(t?.value) ?? num(body.threshold) ?? num(labels.threshold);
  const observed = num(t?.observed) ?? num(body.value) ?? num(labels.value);
  if (metric === undefined && op === undefined && value === undefined && observed === undefined) {
    return undefined;
  }
  return { metric, op, value, observed };
}

/**
 * Reduce Alertmanager / SigNoz envelopes down to a single flat record that
 * carries the fields we care about. Prefer the first alert in an `alerts[]`.
 */
function flatten(input: unknown): { body: Json; source: string } {
  if (!isObject(input)) return { body: {}, source: "manual" };
  const body = input;

  // Alertmanager: { alerts: [ { labels, annotations, startsAt, ... } ], ... }
  if (Array.isArray(body.alerts) && body.alerts.length > 0 && isObject(body.alerts[0])) {
    const first = body.alerts[0] as Json;
    return { body: { ...body, ...first }, source: str(body.source) ?? "alertmanager" };
  }

  // SigNoz nests the alert payload under `alert` or `data`.
  if (isObject(body.alert)) {
    return { body: { ...body, ...(body.alert as Json) }, source: "signoz" };
  }
  if (isObject(body.data)) {
    return { body: { ...body, ...(body.data as Json) }, source: str(body.source) ?? "signoz" };
  }

  return { body, source: str(body.source) ?? "manual" };
}

export function normalizeAlert(input: unknown): Alert {
  const { body, source } = flatten(input);
  const labels = { ...toStringMap(body.labels), ...toStringMap(body.commonLabels) };
  const annotations = {
    ...toStringMap(body.annotations),
    ...toStringMap(body.commonAnnotations),
  };

  const name =
    str(body.name) ??
    str(body.ruleName) ??
    str(body.alertname) ??
    labels.alertname ??
    str(body.title) ??
    "Unnamed alert";

  const description =
    str(body.description) ??
    annotations.description ??
    annotations.summary ??
    str(body.message);

  const service =
    str(body.service) ??
    labels.service ??
    labels.service_name ??
    labels["service.name"] ??
    str(body.serviceName);

  const startsAtMs =
    toMs(body.startsAtMs) ?? toMs(body.startsAt) ?? toMs(body.timestamp) ?? Date.now();
  const endsAtMs = toMs(body.endsAtMs) ?? toMs(body.endsAt);

  const threshold = extractThreshold(body, labels);

  const alert: Alert = {
    id: str(body.id) ?? str(body.fingerprint) ?? randomUUID(),
    name,
    severity: normalizeSeverity(body.severity ?? labels.severity),
    source,
    startsAtMs,
    labels,
  };

  if (description !== undefined) alert.description = description;
  if (service !== undefined) alert.service = service;
  if (endsAtMs !== undefined) alert.endsAtMs = endsAtMs;
  if (Object.keys(annotations).length > 0) alert.annotations = annotations;
  if (threshold !== undefined) alert.threshold = threshold;

  return alert;
}

export default normalizeAlert;

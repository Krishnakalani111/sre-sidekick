/**
 * Evidence: the structured, LLM-ready view of an investigation. The Evidence
 * Collector normalizes raw MCP tool results into these shapes — the RCA step
 * NEVER sees raw MCP responses, only Evidence.
 */
import type { Alert } from "./domain";
import type { ToolResult } from "./mcp";

export interface TraceErrorSpan {
  service: string;
  operation: string;
  statusCode?: string;
  statusMessage?: string;
  exceptionType?: string;
  exceptionMessage?: string;
}

export interface TraceSummary {
  traceId: string;
  rootService: string;
  rootOperation: string;
  durationMs: number;
  spanCount: number;
  hasError: boolean;
  errorSpans: TraceErrorSpan[];
  startTimeMs: number;
}

export interface LogRecord {
  timestampMs: number;
  service: string;
  severity: string;
  body: string;
  traceId?: string;
  spanId?: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface MetricPoint {
  tsMs: number;
  value: number;
}

export interface MetricSeries {
  metric: string;
  aggregation: string;
  labels: Record<string, string>;
  points: MetricPoint[];
}

export interface ServiceSummary {
  name: string;
  errorRatePct: number;
  p99Ms: number;
  rps: number;
}

export interface FieldInfo {
  key: string;
  dataType: string;
  signal: "traces" | "logs" | "metrics";
}

export type TimelineKind = "alert" | "error" | "deploy" | "metric-breach" | "note";

export interface TimelineEvent {
  tsMs: number;
  kind: TimelineKind;
  service?: string;
  summary: string;
  ref?: string;
}

export interface TimeWindow {
  fromMs: number;
  toMs: number;
}

/**
 * The full evidence bundle accumulated across an investigation.
 */
export interface Evidence {
  alert: Alert;
  window: TimeWindow;
  services: ServiceSummary[];
  traces: TraceSummary[];
  logs: LogRecord[];
  metrics: MetricSeries[];
  fields: FieldInfo[];
  timeline: TimelineEvent[];
  /** Audit trail of every MCP tool call made during the investigation. */
  toolCalls: ToolResult[];
}

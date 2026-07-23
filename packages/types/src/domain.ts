/**
 * Core domain types: the Alert that kicks off an investigation.
 */

export type Severity = "critical" | "warning" | "info";

export interface AlertThreshold {
  metric?: string;
  op?: string; // ">", "<", ">=", etc.
  value?: number;
  observed?: number;
}

/**
 * A normalized alert. Whatever the source (SigNoz alert webhook, Prometheus,
 * a manual trigger), it is mapped into this shape before investigation.
 */
export interface Alert {
  id: string;
  name: string;
  description?: string;
  severity: Severity;
  /** Primary service the alert is about, if known. */
  service?: string;
  /** Where the alert came from, e.g. "signoz", "prometheus", "manual". */
  source: string;
  /** Epoch millis the alert condition started. */
  startsAtMs: number;
  endsAtMs?: number;
  labels: Record<string, string>;
  annotations?: Record<string, string>;
  threshold?: AlertThreshold;
}

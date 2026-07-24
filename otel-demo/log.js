/**
 * Logging via the OTel Logs API so records export to SigNoz over OTLP and are
 * auto-correlated to the active span (trace_id/span_id). Also mirrors to the
 * console. The global LoggerProvider is installed by tracing.js (--import).
 */
import { logs, SeverityNumber } from "@opentelemetry/api-logs";

function emit(severityText, severityNumber, message, attributes) {
  try {
    logs.getLogger("otel-demo").emit({
      severityNumber,
      severityText,
      body: message,
      attributes: attributes || {},
    });
  } catch {
    /* provider not ready */
  }
  const line = JSON.stringify({ level: severityText, message, ...(attributes || {}) });
  if (severityNumber >= SeverityNumber.ERROR) console.error(line);
  else console.log(line);
}

export const log = {
  info: (message, attributes) => emit("INFO", SeverityNumber.INFO, message, attributes),
  warn: (message, attributes) => emit("WARN", SeverityNumber.WARN, message, attributes),
  error: (message, attributes) => emit("ERROR", SeverityNumber.ERROR, message, attributes),
};

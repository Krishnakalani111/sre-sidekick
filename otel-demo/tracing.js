/**
 * OpenTelemetry bootstrap, loaded via `node --import ./tracing.js`.
 * Configures OTLP/HTTP export of traces, metrics AND logs to SigNoz (:4318)
 * purely through OTEL_* env, then enables auto-instrumentation (HTTP server +
 * fetch client for distributed traces, pino for trace-correlated logs).
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||= "http://localhost:4318";
process.env.OTEL_EXPORTER_OTLP_PROTOCOL ||= "http/protobuf";
process.env.OTEL_TRACES_EXPORTER ||= "otlp";
process.env.OTEL_METRICS_EXPORTER ||= "otlp";
process.env.OTEL_LOGS_EXPORTER ||= "otlp";
process.env.OTEL_METRIC_EXPORT_INTERVAL ||= "10000";
process.env.OTEL_METRIC_EXPORT_TIMEOUT ||= "8000";
process.env.OTEL_SERVICE_NAME ||= "otel-demo";

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-pino": { enabled: true },
    }),
  ],
});

sdk.start();
process.on("SIGTERM", () => sdk.shutdown().finally(() => process.exit(0)));
process.on("SIGINT", () => sdk.shutdown().finally(() => process.exit(0)));

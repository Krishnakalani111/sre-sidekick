# otel-demo — a tiny instrumented 2-service system for SigNoz

`checkout` (:5001) → `payments` (:5002). Every `/checkout` calls `payments`
`/charge`, producing a **2-hop distributed trace**. Fully instrumented for
**traces + logs + metrics**, exported OTLP/HTTP to local SigNoz (`:4318`).

Feeds the SRE Sidekick with real incident data (real MCP → real RCA).

## Signals emitted
- **Traces:** auto-instrumented HTTP server + fetch client (context propagated → linked 2-hop spans; 5xx marked as error spans).
- **Logs:** OTel Logs API (`log.js`), exported to SigNoz and correlated to the active span (trace_id/span_id).
- **Metrics:** custom `checkout_requests_total`, `charges_total`, `charge_duration_ms`, `payments_worker_pool_in_use`, plus auto HTTP metrics.

## Run
```bash
npm install
# start services (payments incident mode optional):
OTEL_SERVICE_NAME=payments node --import ./tracing.js payments.js   # :5002
OTEL_SERVICE_NAME=checkout node --import ./tracing.js checkout.js   # :5001
node load.js 120 5           # 120s of traffic, concurrency 5
```

## Induce the incident (payments "worker-pool saturation")
```bash
curl -XPOST localhost:5002/admin/incident -H content-type:application/json -d '{"on":true}'
# ~35% of charges 500, ~45% slow (2.5-4s) -> checkout 5xx + p99 spike
curl -XPOST localhost:5002/admin/incident -H content-type:application/json -d '{"on":false}'  # recover
```

## Alert
A traces-based threshold alert **"Checkout high 5xx error rate"** was created in
SigNoz (via the MCP `signoz_create_alert` tool): fires when error spans on
`checkout` exceed 5 in the window, routed to the `test1` channel.

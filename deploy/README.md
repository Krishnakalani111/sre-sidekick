# Deploy — SigNoz (Foundry) + the Sidekick stack

## SigNoz via Foundry (`deploy/signoz/`)
`casting.yaml` + `casting.yaml.lock` are the Foundry manifests. Reproduce the
observability backend with:

```bash
cd deploy/signoz
foundryctl cast -f casting.yaml   # gauge (env check) -> forge (render pours/) -> cast (start)
```

This needs a **Docker host** (a VM / EC2, or a laptop with Docker) — SigNoz runs
ClickHouse + collector + query service via docker-compose. It is **not**
serverless; give it ~4–8 GB RAM and a data volume.

> **MCP server:** enabled in `casting.yaml` via `spec.mcp.spec.enabled: true`, so
> `foundryctl cast` deploys `signoz-mcp-server` (HTTP `:8000/mcp`) automatically.
> Foundry auto-wires `TRANSPORT_MODE=http`, `MCP_SERVER_PORT=8000`, and `SIGNOZ_URL`
> to the co-located SigNoz. The Sidekick authenticates per-request with a
> `SIGNOZ-API-KEY` header (create the key in SigNoz UI → Settings → API Keys and
> set it as the backend's `SIGNOZ_API_KEY`) — no secret is stored in the manifests.

## The Sidekick app (run AFTER SigNoz — it joins SigNoz's `signoz-network`)

Foundry's `cast` creates the `signoz-network`; the app's root `docker-compose.yml`
attaches the backend and n8n to it (external network) and reaches SigNoz by
service name (`signoz-mcp-server:8000`, `signoz-ingester:4318`). So bring SigNoz
up **first**, then from the repo root:

```bash
cp .env.example .env      # set SIGNOZ_API_KEY + an LLM key (or LLM_PROVIDER=mock)
docker compose up -d                    # postgres + backend (:3000) + frontend (:5173)
docker compose --profile slack up -d    # + Slack bot
docker compose --profile n8n up -d      # + n8n + seeded nl2sql postgres
```

**n8n instrumentation:** n8n exports OpenTelemetry traces of its workflow
executions to SigNoz (`N8N_OTEL_ENABLED=true`, endpoint `signoz-ingester:4318`,
`N8N_OTEL_TRACES_PRODUCTION_ONLY=false` so manual runs also emit spans). Verified:
`n8n` appears as a service in SigNoz with `workflow.execute` / `node.execute` spans.

## SigNoz features exercised (for judging)
- **MCP server** — powers the whole RCA engine (41 tools discovered at runtime).
- **Alerts** — `scripts/create-alert.ts` (traces-based threshold on checkout 5xx).
- **Dashboards** — `scripts/create-dashboard.ts` ("Checkout / Payments Health").
- **Query Builder** — `scripts/create-view.ts` (saved traces view) + the alert/dashboard builder queries.

See `INTEGRATION.md` (client contracts) and `apps/backend/DASHBOARD_API.md` (dashboard table API).

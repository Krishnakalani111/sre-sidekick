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

## The Sidekick app
- **Postgres** (investigation history): `docker compose up -d` at the repo root.
- **Backend**: `pnpm backend` (needs `SIGNOZ_API_KEY`, `MCP_SERVER_URL`, an LLM key or `LLM_PROVIDER=mock`).
- **Slack bot**: `cd apps/slack-bot && npm start`.

See `INTEGRATION.md` (contracts) and `apps/backend/DASHBOARD_API.md` (dashboard table API).

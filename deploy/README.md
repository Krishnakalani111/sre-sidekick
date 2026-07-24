# Deploy — SigNoz (Foundry) + the Sidekick stack

## SigNoz via Foundry (`deploy/signoz/`)
`casting.yaml` + `casting.yaml.lock` are the Foundry manifests. Reproduce the
observability backend with:

```bash
cd deploy/signoz
foundry cast            # expands casting.yaml -> pours/deployment/compose.yaml
```

This needs a **Docker host** (a VM / EC2, or a laptop with Docker) — SigNoz runs
ClickHouse + collector + query service via docker-compose. It is **not**
serverless; give it ~4–8 GB RAM and a data volume.

> **MCP server note:** `pours/deployment/compose.yaml` in this repo already
> includes the `signoz-mcp-server` service (HTTP `:8000/mcp`) that the Sidekick
> queries. A *fresh* `foundry cast` regenerates the base SigNoz compose without
> it, so either run the committed compose as-is, or re-add the `signoz-mcp-server`
> service after casting. Set `SIGNOZ_API_KEY` in the environment before bringing
> it up (`export SIGNOZ_API_KEY=...`); the resolved `.env` is gitignored.

## The Sidekick app
- **Postgres** (investigation history): `docker compose up -d` at the repo root.
- **Backend**: `pnpm backend` (needs `SIGNOZ_API_KEY`, `MCP_SERVER_URL`, an LLM key or `LLM_PROVIDER=mock`).
- **Slack bot**: `cd apps/slack-bot && npm start`.

See `INTEGRATION.md` (contracts) and `apps/backend/DASHBOARD_API.md` (dashboard table API).

# SRE Sidekick

An **MCP-first** AI SRE assistant. It receives an alert, then investigates by
driving the **SigNoz MCP server** as its primary data source — planning which
MCP tools to call, executing them, collecting structured evidence, and only then
reasoning with an LLM to produce a root-cause **Diagnosis**.

> The MCP planning → execution → evidence pipeline **is** the project. Webhooks,
> Slack, voice, and dashboards are just ways to trigger or consume an
> investigation. (Slack/voice/dashboard are intentionally not built yet.)

## Architecture

```
        Alert (POST /webhook/alert)
              │
              ▼
     Investigation Orchestrator
              │
              ▼
     MCP Planner  (LLM decides which tools to call)
              │
              ▼
     MCP Tool Executor  ──► SigNoz MCP Server (real, deployed via Foundry)
              │                     │
              │        ┌────────────┼────────────┐
              │        ▼            ▼            ▼
              │   search_traces  search_logs  query_metrics
              │        └────────────┼────────────┘
              ▼                     ▼
       Evidence Collector  (structured Evidence, not raw responses)
              │
              ▼
        RCA LLM reasoning  (Gemini | Grok | mock)
              │
              ▼
         Diagnosis object  ──► returned / logged
```

## Layout

```
packages/
  types/        @sre/types        shared contracts + MCP tool types (source of truth)
  mcp-client/   @sre/mcp-client   MCP client: transport + tool discovery + executor
  llm/          @sre/llm          Gemini / Grok / mock LLM clients
  prompts/      @sre/prompts      planner / diagnosis / rca prompt templates
  stt/          @sre/stt          speech-to-text (Deepgram) for the voice path
  slack/        @sre/slack        outbound Slack notifications (see its README)
apps/
  backend/          @sre/backend    Express: /webhook/alert, /investigate, /notify/slack, dashboard API
  slack-bot/        @sre/slack-bot  Slack bot -> backend /investigate
  frontend/                         dashboard UI (colleague)
  chaos-generator/                  n8n workflow (+ its own docker-compose)
  n8n-workflow/                     n8n workflow (+ its own docker-compose):
                                    Natural Language -> SQL. Webhook -> LLM
                                    writes SQL -> Postgres executes it -> LLM
                                    summarizes the rows (see its README)
otel-demo/                          instrumented checkout->payments demo (traces/logs/metrics)
deploy/signoz/                      Foundry casting.yaml (+ .lock) — SigNoz + MCP server
docker-compose.yml                  dockerized Postgres (investigation history)
```

## Quick start

```bash
# 0. SigNoz + MCP server (needs a Docker host). Reproduce with Foundry:
cd deploy/signoz && foundryctl cast -f casting.yaml     # SigNoz UI :8080, MCP :8000/mcp
#    (or use an existing SigNoz; the MCP molding is enabled in casting.yaml)

# 1. App — all in Docker (postgres + backend)
cd sre-sidekick
cp .env.example .env          # fill in the critical keys listed at the bottom of
                               # .env.example — MUST land on disk before
                               # `docker compose up`: Compose reads ${VAR}
                               # substitutions from the host .env at "up" time.
docker compose up -d          # postgres + backend on :3000
docker compose --profile slack up -d   # ...also start the Slack bot
#   dev alternative (hot Node):  docker compose up -d postgres && pnpm install && pnpm backend

# 2. Fire an investigation
curl -XPOST localhost:3000/investigate -H content-type:application/json \
  -d '{"query":"checkout is throwing 5xx errors"}'
```

Every non-secret value in `.env.example` already has a safe default, so the pipeline
runs fully offline in mock mode (`LLM_PROVIDER=mock`, empty `SIGNOZ_API_KEY`) with
zero keys filled in. `scripts/fetch-env.js` (auto-fetches `.env` from a public gist
on `pnpm install`) has been disabled — it was silently pulling secrets from a
third-party-controlled URL, and Google flagged one such key as leaked. Get real
keys from a teammate or your own accounts instead; never commit `.env` or publish
it anywhere reachable by URL.

Everything in `.env.example` has a safe default or runs fine empty (mock mode)
**except** these — fill them in yourself for real (non-mock) behavior:

```
DEEPGRAM_API_KEY     - console.deepgram.com (voice/STT path)
SIGNOZ_API_KEY       - SigNoz UI -> Settings -> API Keys (live data)
GEMINI_API_KEY       - aistudio.google.com/apikey (RCA reasoning)
XAI_API_KEY          - console.x.ai (alt. RCA provider)
SLACK_BOT_TOKEN      - api.slack.com/apps -> OAuth & Permissions
SLACK_APP_TOKEN      - api.slack.com/apps -> Basic Information
SLACK_SIGNING_SECRET - api.slack.com/apps -> Basic Information
```

Get them from a teammate or your own accounts — never commit the filled `.env`
or post it anywhere publicly reachable.

## Going live

1. Create a SigNoz API key (UI → Settings → API Keys), set `SIGNOZ_API_KEY`.
2. Set `GEMINI_API_KEY` (or `XAI_API_KEY`) + `LLM_PROVIDER=gemini`|`grok` for real RCA.
3. Generate telemetry: run `otel-demo` (or your instrumented services) and toggle its incident.
4. Fire `./scripts/fire-alert.sh` (or `@mention` the Slack bot).

See `INTEGRATION.md` (client contracts), `apps/backend/DASHBOARD_API.md` (history/table API),
and `deploy/README.md` (Foundry / Docker-host notes).

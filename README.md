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
     MCP Tool Executor  ──► SigNoz MCP Server (fake-mcp | real SigNoz MCP)
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
  types/        @sre/types        shared contracts + canonical MCP tool schemas (source of truth)
  signoz-rest/  @sre/signoz-rest  typed SigNoz query API client
  mcp-client/   @sre/mcp-client   MCP transport + registry + executor + typed tool wrappers
  llm/          @sre/llm          Gemini / Grok / mock LLM clients
  prompts/      @sre/prompts      planner / diagnosis / rca prompt templates
apps/
  fake-mcp/         @sre/fake-mcp   MCP server: live SigNoz proxy OR canned fixtures
  backend/          @sre/backend    Express webhook + investigation pipeline
  chaos-generator/                  n8n workflow (+ its own docker-compose) that
                                     schedules traffic bursts and injects sustained
                                     chaos via webhook; bring your own target
                                     service + telemetry backend (see its README)
```

## Quick start (mock mode — no keys)

```bash
pnpm install
pnpm fake-mcp     # terminal 1: MCP server on :8787
pnpm backend      # terminal 2: Express on :3000
curl -XPOST localhost:3000/webhook/alert -H content-type:application/json \
  -d '{"name":"HighErrorRate","service":"gateway","severity":"critical"}'
```

## Going live

1. Create a SigNoz API key (UI → Settings → API Keys), set `SIGNOZ_API_KEY`.
2. Set `USE_FAKE_MCP=false` so fake-mcp proxies the real local SigNoz.
3. Set `GEMINI_API_KEY` (or `XAI_API_KEY`) for real RCA.
4. Trigger a genuine incident from `~/otel-debug-lab` and fire the alert.

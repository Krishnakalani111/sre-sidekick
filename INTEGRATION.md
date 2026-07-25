# Integrating with the SRE Sidekick

The Sidekick investigates incidents by driving the **SigNoz MCP server**, then
returns a root-cause diagnosis. There are **two ways in**, and both return the
same RCA data. If you're building Slack, voice/STT, or any UI — you only need
the HTTP contracts below.

```
Slack / Voice(STT) ──POST /investigate {query}──┐
                                                 ├──► backend ──► SigNoz MCP ──► RCA
SigNoz alert ────────POST /webhook/alert ────────┘
```

## 1. Run the stack (local)

```bash
# 0. SigNoz must be running locally (:8080) with the MCP server on :8000.
# 1. Backend
cd sre-sidekick && pnpm install
cp .env.example .env        # then fill in the keys below
pnpm backend                # http://localhost:3000

# 2. (optional) demo telemetry so there's something to diagnose
cd otel-demo && npm install
OTEL_SERVICE_NAME=payments node --import ./tracing.js payments.js   # :5002
OTEL_SERVICE_NAME=checkout node --import ./tracing.js checkout.js   # :5001
node load.js 120 5
curl -XPOST localhost:5002/admin/incident -d '{"on":true}' -H content-type:application/json  # cause an incident

# 3. Slack bot
cd apps/slack-bot && npm install && npm start
```

### `.env` (backend) — keys you need
| var | purpose |
|-----|---------|
| `SIGNOZ_API_KEY` | backend/MCP → SigNoz (Admin API key from SigNoz UI → Settings → API Keys) |
| `MCP_SERVER_URL` | `http://localhost:8000/mcp` |
| `GEMINI_API_KEY` **or** `XAI_API_KEY` | the RCA LLM. Set `LLM_PROVIDER=gemini`\|`grok`\|`mock` |
| `GEMINI_MODEL` | `gemini-2.5-flash-lite` (free tier is per-model/day) |

> No LLM key? Set `LLM_PROVIDER=mock` — the whole flow runs offline with a canned diagnosis (great for building UI without burning quota).

## 2. HTTP contract — this is all a client needs

### `POST /investigate`  ← Slack bot, voice/STT
Free-text question in, RCA out. **Same response the Slack bot and STT both use.**

```bash
curl -XPOST localhost:3000/investigate -H content-type:application/json \
  -d '{"query":"checkout is throwing 5xx errors"}'
```
```jsonc
{
  "investigationId": "…",
  "status": "completed",
  "title": "Checkout Service High 5xx Error Rate",
  "rootCause": "…",
  "confidence": 0.9,                 // 0..1
  "evidence": ["…", "…"],            // string[] — render as bullets
  "suggestedFix": "…",
  "affectedServices": ["checkout"],
  "recommendedActions": [{ "title": "…", "detail": "…", "risk": "medium", "requiresApproval": true }],
  "timeline": [{ "time": "ISO", "event": "…" }],
  "verificationStatus": "pending_approval"
}
```

- **Slack bot:** already wired — `apps/slack-bot/src/backendClient.js` calls this. Set `BACKEND_URL` (default `http://localhost:3000`). `@mention` or DM the bot; it replies with the RCA blocks + Approve/Dismiss buttons.
- **Voice/STT:** transcribe speech → send the text as `{query}` to the same endpoint → speak/return `rootCause`, `confidence`, `evidence`, `suggestedFix`.

### `POST /webhook/alert`  ← SigNoz auto-trigger
Point a SigNoz notification channel (webhook) at this to auto-investigate when an
alert fires. Accepts SigNoz/Alertmanager/raw shapes.
```bash
curl -XPOST localhost:3000/webhook/alert -H content-type:application/json \
  -d '{"name":"CheckoutHighErrorRate","service":"checkout","severity":"critical"}'
# → { investigationId, diagnosis, steps }
```
For SigNoz (in Docker) to reach the backend on your host, the channel's Webhook
URL must be `http://host.docker.internal:3000/webhook/alert` (not `localhost`).

### `GET /investigations/:id` — fetch a stored result. `GET /health` — liveness.

### `POST /notify/slack[/*]`  → OUTBOUND to Slack
The reverse direction: any service (a cron/anomaly watcher, another team's
service) fires a Slack message. Channel is optional — falls back to
`SLACK_DEFAULT_CHANNEL`. Returns `200 { ok, channel, ts }`; `503` if no
`SLACK_BOT_TOKEN` is set.
```bash
curl -XPOST localhost:3000/notify/slack -H content-type:application/json \
  -d '{"text":"checkout p99 anomaly detected"}'
curl -XPOST localhost:3000/notify/slack/alert     -d '{"alert":{...}}'      -H content-type:application/json
curl -XPOST localhost:3000/notify/slack/diagnosis -d '{"diagnosis":{...}}'  -H content-type:application/json
```
Monorepo TS code can skip HTTP and `import { createSlackClient } from "@sre/slack"`
directly. Full usage + function list: `packages/slack/README.md`.
> Set `SLACK_BOT_TOKEN` + `SLACK_DEFAULT_CHANNEL` and **invite the bot to the
> channel** (`/invite @bot`) — `chat:write` only posts to channels it's in.

## 3. Test each layer yourself
| Layer | Command / action | Expect |
|-------|------------------|--------|
| Backend up | `curl localhost:3000/health` | `{status:"ok", mcp:true, provider:…}` |
| MCP → SigNoz data | `pnpm exec tsx scripts/mcp-introspect.ts` | `ok=true`, real services/traces/logs |
| Free-text RCA | `curl -XPOST .../investigate -d '{"query":"…"}'` | RCA JSON above |
| Alert → RCA | `./scripts/fire-alert.sh` | diagnosis JSON |
| SigNoz auto-alert | trip the alert (run otel-demo incident) | backend logs `Webhook received alert` |
| Slack | `@mention`/DM the bot | RCA reply with buttons |

## Gotchas
- **LLM free quota is per-model/day** (~20 req). One investigation = up to ~5 LLM calls. If you hit `429`, switch `GEMINI_MODEL`, use `LLM_PROVIDER=mock`, or add billing/credits.
- Alerts/queries only return data for services **actually sending telemetry** (e.g. `checkout`/`payments` from `otel-demo`).

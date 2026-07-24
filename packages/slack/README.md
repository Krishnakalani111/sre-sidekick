# @sre/slack

Outbound Slack notifications for the SRE Sidekick. A small `@slack/web-api`
wrapper that **any** service can use to *push* messages into Slack — a
cron/anomaly watcher firing an alert, the backend posting an RCA, etc.

> This is the **outbound** direction. The interactive `apps/slack-bot` (which
> *reacts* to `@mentions`/DMs) is separate. Use this package when a service needs
> to post to Slack on its own initiative.

## Two ways to use it

### A) Import the package (TypeScript, inside the monorepo)

```ts
import { createSlackClient } from "@sre/slack";
import type { Alert, Diagnosis } from "@sre/types";

const slack = createSlackClient(); // reads SLACK_BOT_TOKEN + SLACK_DEFAULT_CHANNEL from env

// Fire-and-forget guard: stays quiet if Slack isn't configured
if (!slack.configured) return;

// Full incident lifecycle, all in one thread:
const alert: Alert = /* … */;
const ref = await slack.sendAlert(alert);                       // anomaly card → { channel, ts }
const ack = await slack.startInvestigation(alert, { threadTs: ref.ts });
await slack.replyInThread({ threadTs: ref.ts, text: "Pulling traces…" });
await slack.sendDiagnosis(diagnosis, { threadTs: ref.ts, investigationId: "inv-1" });
await slack.markResolved(ack, { note: "Recovered", react: true });
```

`createSlackClient(opts?)` — every option falls back to an env var:

| option | env var | purpose |
|--------|---------|---------|
| `botToken` | `SLACK_BOT_TOKEN` | Slack bot token (`xoxb-…`) |
| `defaultChannel` | `SLACK_DEFAULT_CHANNEL` | channel used when a call omits `channel` |

### B) HTTP (any language / curl) — via the backend

The backend mounts these routes (`apps/backend/src/routes/notify.ts`):

```bash
# generic message
curl -XPOST localhost:3000/notify/slack -H content-type:application/json \
  -d '{"text":"checkout p99 anomaly detected"}'

# typed alert card (loose shape is normalized)
curl -XPOST localhost:3000/notify/slack/alert -H content-type:application/json \
  -d '{"alert":{"name":"Checkout 5xx","severity":"critical","service":"checkout"}}'

# RCA card with Approve/Dismiss buttons
curl -XPOST localhost:3000/notify/slack/diagnosis -H content-type:application/json \
  -d '{"diagnosis":{"title":"…","summary":"…","rootCause":"…","confidence":0.9,"recommendedActions":[]}}'
```

All return `200 { ok: true, channel, ts }`. `channel` is optional on every
endpoint (falls back to `SLACK_DEFAULT_CHANNEL`).

## Functions

| function | what it does |
|----------|--------------|
| `sendMessage({channel?, text, blocks?, threadTs?})` | generic send; the primitive everything builds on |
| `updateMessage({channel, ts, text?, blocks?})` | edit a message in place |
| `replyInThread({channel?, threadTs, text, blocks?, broadcast?})` | threaded follow-up |
| `addReaction({channel, ts, name})` | add an emoji _(needs `reactions:write` scope)_ |
| `sendAlert(alert, opts?)` | anomaly/alert card (severity-coded) |
| `startInvestigation(alert, opts?)` | "investigating…" ack; returns a ref to update later |
| `sendDiagnosis(diagnosis, opts?)` | RCA card + Approve/Dismiss buttons |
| `postRecommendedActions(actions, opts?)` | standalone action buttons |
| `markResolved(ref, {note?, react?})` | edit a message to a "Resolved ✅" card |

Each send returns a `MessageRef { channel, ts }` — pass it back to
`updateMessage` / `replyInThread` / `markResolved` to thread or edit. Use
`channel` from the ref (the resolved id), not a human `#name`.

Also exported: Block Kit builders (`alertToBlocks`, `diagnosisToBlocks`,
`recommendedActionsToBlocks`, `investigationStartedBlocks`, `resolvedBlocks`) and
helpers (`severityEmoji`, `severityColor`, `confidenceLabel`), so you can compose
custom messages; and `ACTION_IDS` (`approve_fix` / `dismiss_fix`), shared with the
interactive bot's button handlers.

## Setup

1. Create a Slack app, add bot scope **`chat:write`** (and **`reactions:write`**
   if you want emoji reactions). Install it and copy the bot token.
2. Set `SLACK_BOT_TOKEN` and `SLACK_DEFAULT_CHANNEL` (id like `C0123ABCD`, or `#name`).
3. **Invite the bot to the channel:** in Slack, `/invite @your-bot`. `chat:write`
   only posts to channels the bot is a member of (else `not_in_channel`).

## Behavior & errors

- **Unconfigured (no token):** `configured` is `false` and every send throws a
  `SlackError` with `status: 503` — the app keeps running, Slack is just disabled.
- **`SlackError`** carries an HTTP `status` and the Slack `code`. Common mappings:
  `not_in_channel`/`channel_not_found`/`invalid_blocks` → 422, `missing_scope` →
  403, `ratelimited` → 429 (auto-retried first). Over HTTP these become the
  response status.
- **No channel & no default** → `SlackError(400)` (never silently dropped).
- Long evidence lists and text are truncated to stay within Block Kit limits.

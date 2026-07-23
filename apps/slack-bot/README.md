# AI SRE Sidekick — Slack Bot (mock backend)

Standalone Slack piece from the AI SRE Sidekick project. Right now `investigate()`
in `src/mockBackend.js` fakes what KK's real Node.js Sidekick server will return
from `/investigate`. Once that endpoint is live, swap the call in `src/app.js`
for a real `fetch("http://sidekick-host/investigate", ...)` — the response
shape is already aligned.

## 1. Create the Slack app

1. Go to https://api.slack.com/apps -> **Create New App** -> **From scratch**.
2. Name it (e.g. `SRE Sidekick`) and pick your workspace.

## 2. Enable Socket Mode

**Settings -> Socket Mode** -> toggle on. This generates an **App-Level Token**
(scope `connections:write`) — copy it, it starts with `xapp-`.

Socket Mode means no public URL / ngrok needed for local dev.

## 3. Bot token scopes

**Features -> OAuth & Permissions -> Scopes -> Bot Token Scopes**, add:
- `app_mentions:read`
- `chat:write`
- `im:history`
- `im:read`
- `im:write`

## 4. Subscribe to events

**Features -> Event Subscriptions** -> toggle on (Socket Mode already covers
delivery, no Request URL needed). Under **Subscribe to bot events**, add:
- `app_mention`
- `message.im`

## 5. Install the app

**Features -> OAuth & Permissions** -> **Install to Workspace**. Copy the
**Bot User OAuth Token** (`xoxb-...`).

Also grab the **Signing Secret** from **Settings -> Basic Information**.

## 6. Invite the bot

In Slack, invite the bot to a channel (`/invite @SRE Sidekick`), or just DM it
directly.

## 7. Configure and run

```bash
cd ai-sre-slack-bot
cp .env.example .env
# fill in SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_SIGNING_SECRET
npm install
npm start
```

## 8. Try it

- In a channel the bot is in: `@SRE Sidekick checkout is slow`
- Or DM the bot: `checkout is slow`

It replies in-thread with a mocked root cause, confidence score, evidence,
and a suggested fix, plus **Approve Fix** / **Dismiss** buttons.

## Next steps (when merging into main project)

- Replace `mockBackend.investigate()` with a real HTTP call to the Sidekick
  server's `/investigate` endpoint.
- Add a route/webhook so the Sidekick server can also *push* alerts into
  Slack proactively (not just respond to `@mentions`/DMs).
- Wire `approve_fix` action to actually call the Sidekick's remediation API.

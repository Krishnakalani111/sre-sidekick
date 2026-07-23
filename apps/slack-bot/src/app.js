require("dotenv").config();
const { App } = require("@slack/bolt");
const backend = require("./mockBackend");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

function rcaToBlocks(result) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Root Cause:* ${result.rootCause}\n*Confidence:* ${(result.confidence * 100).toFixed(0)}%`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Evidence:*\n${result.evidence.map((e) => `• ${e}`).join("\n")}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Suggested Fix:* ${result.suggestedFix}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Approve Fix" },
          style: "primary",
          action_id: "approve_fix",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Dismiss" },
          action_id: "dismiss_fix",
        },
      ],
    },
  ];
}

// @mention the bot in a channel, e.g. "@sidekick checkout is slow"
app.event("app_mention", async ({ event, client, say }) => {
  const query = event.text.replace(/<@[^>]+>/g, "").trim();

  await say({ thread_ts: event.ts, text: `Investigating: "${query}"...` });

  const result = await backend.investigate(query);

  await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.ts,
    text: `RCA for: ${query}`,
    blocks: rcaToBlocks(result),
  });
});

// DM the bot directly
app.message(async ({ message, say }) => {
  if (message.channel_type !== "im" || message.subtype) return;

  await say(`Investigating: "${message.text}"...`);

  const result = await backend.investigate(message.text);

  await say({
    text: `RCA for: ${message.text}`,
    blocks: rcaToBlocks(result),
  });
});

app.action("approve_fix", async ({ ack, body, client }) => {
  await ack();
  await client.chat.postMessage({
    channel: body.channel.id,
    thread_ts: body.message.ts,
    text: `:white_check_mark: Fix approved by <@${body.user.id}>. (mock) Executing remediation and verifying recovery...`,
  });
});

app.action("dismiss_fix", async ({ ack, body, client }) => {
  await ack();
  await client.chat.postMessage({
    channel: body.channel.id,
    thread_ts: body.message.ts,
    text: `Dismissed by <@${body.user.id}>.`,
  });
});

(async () => {
  await app.start();
  console.log("AI SRE Sidekick Slack bot is running (mock backend, Socket Mode)");
})();

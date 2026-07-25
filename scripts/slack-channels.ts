/** List channels the Slack bot is a member of. Run: tsx scripts/slack-channels.ts */
import { readFileSync } from "node:fs";

function readEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const l of readFileSync(path, "utf8").split("\n")) {
      const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch {
    /* ignore */
  }
  return out;
}
// Bot token lives in the slack-bot env (and/or root .env)
const env = { ...readEnv(new URL("../.env", import.meta.url).pathname), ...readEnv(new URL("../apps/slack-bot/.env", import.meta.url).pathname) };
const token = env.SLACK_BOT_TOKEN;
if (!token) throw new Error("SLACK_BOT_TOKEN not found in .env");

const who = await (await fetch("https://slack.com/api/auth.test", { headers: { Authorization: `Bearer ${token}` } })).json();
console.log("auth.test:", who.ok ? `ok — bot=${who.user} team=${who.team}` : `FAILED: ${who.error}`);

const res = await fetch("https://slack.com/api/users.conversations?types=public_channel,private_channel&limit=200", {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await res.json();
if (!data.ok) {
  console.log("users.conversations FAILED:", data.error, "(the bot may need to be invited to a channel; scopes: channels:read, groups:read)");
} else {
  const chans = (data.channels || []).map((c: { name: string; id: string }) => `#${c.name} (${c.id})`);
  console.log("bot is in channels:", chans.length ? chans.join(", ") : "(none — invite the bot to a channel with /invite @yourbot)");
}

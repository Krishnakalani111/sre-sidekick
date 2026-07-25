/** Inspect SigNoz notification channels (webhook URLs) + alert rules. */
import { readFileSync } from "node:fs";
import { createMcpClient } from "@sre/mcp-client";

const env: Record<string, string> = {};
for (const l of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const url = (env.MCP_SERVER_URL || "http://localhost:8000/mcp")
  .replace("host.docker.internal", "localhost")
  .replace("signoz-mcp-server", "localhost");
const c = createMcpClient({ url, apiKey: env.SIGNOZ_API_KEY, mock: false });
await c.connect();

console.log("=== notification channels ===");
const chans = await c.callTool("signoz_list_notification_channels", { searchContext: "inspect" });
let list: { id: string; name: string }[] = [];
try {
  list = JSON.parse(chans.text || "{}").data || [];
} catch { /* */ }
for (const ch of list) {
  const detail = await c.callTool("signoz_get_notification_channel", { id: ch.id, searchContext: "get url" });
  const t = detail.text || detail.error || "";
  const urlMatch = t.match(/https?:\/\/[^\s"']+/g);
  console.log(`  ${ch.name} (${ch.id}): ${urlMatch ? urlMatch.join(", ") : t.slice(0, 160)}`);
}

console.log("\n=== alert rules ===");
const rules = await c.callTool("signoz_list_alert_rules", { searchContext: "inspect" });
try {
  for (const r of JSON.parse(rules.text || "{}").data || []) {
    console.log(`  ${r.alert} | type=${r.alertType} | state=${r.state} | disabled=${r.disabled}`);
  }
} catch {
  console.log((rules.text || rules.error || "").slice(0, 300));
}
await c.close();

/** Inspect SigNoz notification channels (where alerts get delivered). */
import { readFileSync } from "node:fs";
import { createMcpClient } from "@sre/mcp-client";
const env: Record<string, string> = {};
for (const l of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const c = createMcpClient({ url: env.MCP_SERVER_URL, apiKey: env.SIGNOZ_API_KEY, mock: !env.SIGNOZ_API_KEY });
await c.connect();
const r = await c.callTool("signoz_list_notification_channels", { searchContext: "inspect channels" });
console.log((r.text || r.error || "").slice(0, 1200));
await c.close();

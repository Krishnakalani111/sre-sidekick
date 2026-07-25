/** Verify SigNoz MCP tools that returned large responses. Run: tsx scripts/verify-signoz.ts */
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

for (const [name, input] of [
  ["signoz_list_services", { timeRange: "30m" }],
  ["signoz_get_field_values", { signal: "traces", name: "service.name", searchContext: "list trace services" }],
  ["signoz_list_alert_rules", { searchContext: "list alert rules" }],
] as const) {
  const r = await c.callTool(name, input as Record<string, unknown>);
  const t = r.text || r.error || "";
  console.log(`\n=== ${name} === ok=${r.ok} len=${t.length} mentions-n8n=${/n8n/i.test(t)}`);
  console.log(t.slice(0, 220));
}
await c.close();

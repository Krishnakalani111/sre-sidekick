/** Create the n8n workflow-failure alert via MCP. Run: tsx scripts/create-alert-n8n.ts */
import { readFileSync } from "node:fs";
import { createMcpClient } from "@sre/mcp-client";

const env: Record<string, string> = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const url = (env.MCP_SERVER_URL || "http://localhost:8000/mcp")
  .replace("host.docker.internal", "localhost")
  .replace("signoz-mcp-server", "localhost");

const client = createMcpClient({ url, apiKey: env.SIGNOZ_API_KEY, mock: !env.SIGNOZ_API_KEY });
await client.connect();

const input = {
  alert: "n8n workflow failures",
  alertType: "TRACES_BASED_ALERT",
  ruleType: "threshold_rule",
  description:
    "n8n workflow/node executions are failing (error spans). Value {{$value}} over threshold {{$threshold}}. The Sidekick will auto-investigate and post an RCA.",
  labels: { severity: "critical", service: "n8n", team: "automation" },
  condition: {
    compositeQuery: {
      queryType: "builder",
      panelType: "graph",
      queries: [
        {
          type: "builder_query",
          spec: {
            name: "A",
            signal: "traces",
            aggregations: [{ expression: "count()" }],
            filter: { expression: "service.name = 'n8n' AND has_error = true" },
            stepInterval: 60,
          },
        },
      ],
    },
    selectedQueryName: "A",
    thresholds: {
      kind: "basic",
      spec: [{ name: "critical", target: 3, op: "1", matchType: "1", channels: ["test1"] }],
    },
  },
  searchContext: "create alert: n8n workflow failures (error spans) -> auto RCA to Slack",
};

const r = await client.callTool("signoz_create_alert", input);
console.log(`ok=${r.ok}`);
console.log((r.text || r.error || "").slice(0, 800));
await client.close();

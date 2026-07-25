/** Create a SigNoz alert via the MCP server. Run: tsx scripts/create-alert.ts */
import { readFileSync } from "node:fs";
import { createMcpClient } from "@sre/mcp-client";

const env: Record<string, string> = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const client = createMcpClient({
  url: env.MCP_SERVER_URL || "http://localhost:8000/mcp",
  apiKey: env.SIGNOZ_API_KEY,
  mock: !env.SIGNOZ_API_KEY,
});
await client.connect();

const input = {
  alert: "Checkout high 5xx error rate",
  alertType: "TRACES_BASED_ALERT",
  ruleType: "threshold_rule",
  description:
    "checkout error spans elevated (5xx) — typically a downstream payments failure. Value {{$value}} over threshold {{$threshold}}.",
  labels: { severity: "critical", service: "checkout", team: "checkout" },
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
            filter: { expression: "service.name = 'checkout' AND has_error = true" },
            stepInterval: 60,
          },
        },
      ],
    },
    selectedQueryName: "A",
    thresholds: {
      kind: "basic",
      spec: [{ name: "critical", target: 5, op: "1", matchType: "1", channels: ["test1"] }],
    },
  },
  searchContext: "create alert: checkout 5xx error rate high due to payments failures",
};

const r = await client.callTool("signoz_create_alert", input);
console.log(`ok=${r.ok}`);
console.log((r.text || r.error || "").slice(0, 1000));
await client.close();

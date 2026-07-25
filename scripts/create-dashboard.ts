/** Create a SigNoz dashboard via the MCP server. Run: tsx scripts/create-dashboard.ts */
import { readFileSync } from "node:fs";
import { createMcpClient } from "@sre/mcp-client";

const env: Record<string, string> = {};
for (const l of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
// host-run script -> reach the MCP server on the published host port
const url = (env.MCP_SERVER_URL || "http://localhost:8000/mcp").replace("host.docker.internal", "localhost").replace("signoz-mcp-server", "localhost");

const client = createMcpClient({ url, apiKey: env.SIGNOZ_API_KEY, mock: !env.SIGNOZ_API_KEY });
await client.connect();

/** A traces graph widget grouped by service.name. */
function tracesWidget(id: string, title: string, aggExpr: string, filterExpr: string) {
  return {
    id,
    title,
    description: "",
    panelTypes: "graph",
    selectedLogFields: [],
    selectedTracesFields: [],
    thresholds: [],
    contextLinks: { linksData: [] },
    query: {
      id,
      queryType: "builder",
      promql: [],
      clickhouse_sql: [],
      builder: {
        queryFormulas: [],
        queryData: [
          {
            queryName: "A",
            dataSource: "traces",
            aggregations: [{ expression: aggExpr }],
            filter: { expression: filterExpr },
            groupBy: [{ key: "service.name", dataType: "string", type: "tag" }],
            expression: "A",
            legend: "{{service.name}}",
            stepInterval: 60,
            orderBy: [],
            selectColumns: [],
            functions: [],
            having: [],
            disabled: false,
            limit: null,
          },
        ],
      },
    },
  };
}

const input = {
  title: "Checkout / Payments Health",
  description: "Error spans and p99 latency for the checkout->payments path.",
  tags: ["sre-sidekick", "latency", "errors"],
  searchContext: "create a dashboard showing checkout/payments error rate and p99 latency",
  widgets: [
    tracesWidget("w-errors", "Error spans by service", "count()", "has_error = true"),
    tracesWidget("w-p99", "p99 latency by service (ns)", "p99(duration_nano)", ""),
  ],
  layout: [
    { i: "w-errors", x: 0, y: 0, w: 6, h: 4 },
    { i: "w-p99", x: 6, y: 0, w: 6, h: 4 },
  ],
};

const r = await client.callTool("signoz_create_dashboard", input);
console.log(`ok=${r.ok}`);
console.log((r.text || r.error || "").slice(0, 1200));
await client.close();

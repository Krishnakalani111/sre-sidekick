/** Create a SigNoz Query Builder saved view via MCP. Run: tsx scripts/create-view.ts */
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

const client = createMcpClient({ url, apiKey: env.SIGNOZ_API_KEY, mock: !env.SIGNOZ_API_KEY });
await client.connect();

const input = {
  name: "Checkout error spans",
  sourcePage: "traces",
  category: "sre-sidekick",
  tags: ["errors", "checkout"],
  searchContext: "save a Query Builder view of checkout error spans (5xx) in the traces explorer",
  compositeQuery: {
    queryType: "builder",
    panelType: "list",
    queries: [
      {
        type: "builder_query",
        spec: {
          name: "A",
          signal: "traces",
          filter: { expression: "service.name = 'checkout' AND has_error = true" },
          disabled: false,
        },
      },
    ],
  },
};

const r = await client.callTool("signoz_create_view", input);
console.log(`ok=${r.ok}`);
console.log((r.text || r.error || "").slice(0, 900));
await client.close();

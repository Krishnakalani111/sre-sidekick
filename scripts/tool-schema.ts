/** Print the full input schema of one MCP tool. Usage: tsx scripts/tool-schema.ts <toolName> */
import { readFileSync } from "node:fs";
import { createMcpClient } from "@sre/mcp-client";

const env: Record<string, string> = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const name = process.argv[2] || "signoz_create_alert";
const client = createMcpClient({
  url: env.MCP_SERVER_URL || "http://localhost:8000/mcp",
  apiKey: env.SIGNOZ_API_KEY,
  mock: !env.SIGNOZ_API_KEY,
});
await client.connect();
const tool = (await client.listTools()).find((t) => t.name === name);
console.log(JSON.stringify(tool?.inputSchema ?? { error: "not found" }, null, 2));
await client.close();

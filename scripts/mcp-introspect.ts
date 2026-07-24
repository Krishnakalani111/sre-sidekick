/**
 * Quota-free MCP introspection: connects to the real SigNoz MCP with the key
 * from .env, lists the tool catalog (names + schemas), and makes ONE real tool
 * call (signoz_list_services) to prove the data path works end-to-end — no LLM
 * involved. Run: pnpm exec tsx scripts/mcp-introspect.ts
 */
import { readFileSync } from "node:fs";
import { createMcpClient } from "@sre/mcp-client";

// minimal .env loader (repo root)
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch {
    /* no .env */
  }
  return env;
}

const env = loadEnv();
const url = env.MCP_SERVER_URL || "http://localhost:8000/mcp";
const apiKey = env.SIGNOZ_API_KEY || undefined;

const client = createMcpClient({ url, apiKey, mock: !apiKey });
await client.connect();
const tools = await client.listTools();

console.log(`\n=== ${tools.length} tools discovered (source: ${apiKey ? "LIVE" : "mock"}) ===`);
for (const t of tools) {
  const props = (t.inputSchema?.properties as Record<string, unknown>) || {};
  console.log(`• ${t.name}(${Object.keys(props).join(", ")})`);
}

// Show the full schema of the service-listing + a couple of core tools.
const focus = tools.filter((t) =>
  ["signoz_list_services", "signoz_search_traces", "signoz_search_logs", "signoz_query_metrics"].includes(t.name),
);
console.log(`\n=== focus tool schemas ===`);
for (const t of focus) {
  console.log(`\n## ${t.name} — ${t.description ?? ""}`);
  console.log(JSON.stringify(t.inputSchema, null, 2)?.slice(0, 1400));
}

// Real calls to prove auth + data path + error visibility (quota-free).
async function call(name: string, input: Record<string, unknown>) {
  console.log(`\n=== ${name} ${JSON.stringify(input)} ===`);
  const r = await client.callTool(name, input);
  console.log(`ok=${r.ok} source=${r.source}`);
  console.log((r.text || r.error || "").slice(0, 700));
}

await call("signoz_list_services", { timeRange: "1h" });
await call("signoz_search_traces", { service: "checkout", error: true, timeRange: "1h", limit: 5 });
await call("signoz_search_logs", { timeRange: "1h", limit: 3 });
await call("signoz_get_field_values", { signal: "logs", name: "service.name", searchContext: "check log services" });

await client.close();

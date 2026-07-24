/** List available xAI models. Run: tsx scripts/xai-models.ts */
import { readFileSync } from "node:fs";
const env: Record<string, string> = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const r = await fetch("https://api.x.ai/v1/models", {
  headers: { Authorization: `Bearer ${env.XAI_API_KEY}` },
});
console.log("status", r.status);
const j = await r.json().catch(() => null);
const ids = j?.data?.map((m: { id: string }) => m.id) ?? j;
console.log(JSON.stringify(ids, null, 2));

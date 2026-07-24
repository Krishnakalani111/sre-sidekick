/**
 * Real backend client — calls the Sidekick's POST /investigate and returns the
 * RCA in the same shape mockBackend used, so app.js is unchanged apart from the
 * require. Set BACKEND_URL (default http://localhost:3000). To fall back to
 * canned data (e.g. backend not running), set USE_MOCK_BACKEND=1.
 */
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

async function investigate(query) {
  if (process.env.USE_MOCK_BACKEND === "1") {
    return require("./mockBackend").investigate(query);
  }
  const res = await fetch(`${BACKEND_URL}/investigate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sidekick backend ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

module.exports = { investigate };

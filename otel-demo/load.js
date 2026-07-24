/**
 * Traffic generator. Usage: node load.js [durationSec=60] [concurrency=4]
 */
const CHECKOUT = process.env.CHECKOUT_URL || "http://localhost:5001";
const durationSec = Number(process.argv[2] || 60);
const concurrency = Number(process.argv[3] || 4);

let ok = 0;
let err = 0;
const deadline = Date.now() + durationSec * 1000;

async function worker() {
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${CHECKOUT}/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ item: "widget-" + Math.floor(Math.random() * 5) }),
      });
      if (r.ok) ok++;
      else err++;
      await r.text();
    } catch {
      err++;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
console.log(`load done: ok=${ok} err=${err} (total=${ok + err})`);

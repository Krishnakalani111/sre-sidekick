/**
 * checkout service (:5001). The user-facing API. Each /checkout call makes a
 * downstream HTTP call to payments (:5002), producing a 2-hop distributed
 * trace. When payments errors or times out, checkout returns 5xx — the symptom
 * that fires the alert.
 */
import express from "express";
import { metrics } from "@opentelemetry/api";
import { log } from "./log.js";

const meter = metrics.getMeter("checkout");
const reqs = meter.createCounter("checkout_requests_total", { description: "checkout requests by status" });
const latency = meter.createHistogram("checkout_duration_ms", { unit: "ms" });
const PAYMENTS = process.env.PAYMENTS_URL || "http://localhost:5002";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/checkout", async (req, res) => {
  const start = Date.now();
  const item = req.body?.item ?? "widget";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000); // 5s upstream timeout
    const r = await fetch(`${PAYMENTS}/charge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: 42, item }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));

    if (!r.ok) {
      reqs.add(1, { status: "error" });
      latency.record(Date.now() - start, { status: "error" });
      log.error("checkout failed: payments returned error", { item, upstreamStatus: r.status });
      return res.status(502).json({ error: "checkout failed", upstream: r.status });
    }
    const payment = await r.json();
    reqs.add(1, { status: "ok" });
    latency.record(Date.now() - start, { status: "ok" });
    log.info("checkout ok", { item, durationMs: Date.now() - start });
    res.json({ status: "ok", item, payment });
  } catch (e) {
    reqs.add(1, { status: "error" });
    latency.record(Date.now() - start, { status: "error" });
    log.error("checkout failed: payments request timed out after 5000ms / unreachable", {
      item,
      error: String(e?.message || e),
    });
    res.status(504).json({ error: "payments timeout" });
  }
});

const port = Number(process.env.PORT || 5001);
app.listen(port, () => log.info("checkout listening", { port, paymentsUrl: PAYMENTS }));

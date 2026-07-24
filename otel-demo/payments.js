/**
 * payments service (:5002). Charges a card. Has an "incident" mode that
 * simulates worker-pool saturation: a fraction of charges fail (500) and many
 * are very slow — the realistic downstream root cause an SRE would find.
 */
import express from "express";
import { metrics } from "@opentelemetry/api";
import { log } from "./log.js";

const meter = metrics.getMeter("payments");
const charges = meter.createCounter("charges_total", { description: "charge attempts by outcome" });
const chargeLatency = meter.createHistogram("charge_duration_ms", { unit: "ms" });
const poolInUse = meter.createUpDownCounter("payments_worker_pool_in_use");

let incident = process.env.INCIDENT === "1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", incident }));

app.post("/admin/incident", (req, res) => {
  incident = Boolean(req.body?.on);
  log.warn(`incident mode ${incident ? "ENABLED" : "disabled"}`, { incident });
  res.json({ incident });
});

app.post("/charge", async (req, res) => {
  const start = Date.now();
  const amount = req.body?.amount ?? 42;
  poolInUse.add(1);
  try {
    if (incident) {
      const roll = Math.random();
      if (roll < 0.35) {
        charges.add(1, { outcome: "error" });
        chargeLatency.record(Date.now() - start, { outcome: "error" });
        log.error("payment processor worker pool exhausted (100/100 in use, queue depth 340) — rejecting charge", {
          amount,
          error: "pool_exhausted",
          pool: "100/100",
          queueDepth: 340,
        });
        return res.status(500).json({ error: "payment processor pool exhausted" });
      }
      if (roll < 0.8) await sleep(2500 + Math.floor(Math.random() * 1500)); // saturated -> slow
    } else {
      await sleep(15 + Math.floor(Math.random() * 40));
    }
    const dur = Date.now() - start;
    charges.add(1, { outcome: "ok" });
    chargeLatency.record(dur, { outcome: "ok" });
    log.info("charge processed", { amount, durationMs: dur });
    res.json({ status: "ok", amount, durationMs: dur });
  } finally {
    poolInUse.add(-1);
  }
});

const port = Number(process.env.PORT || 5002);
app.listen(port, () => log.info("payments listening", { port, incident }));

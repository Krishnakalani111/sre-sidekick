/**
 * POST /webhook/alert — accepts a flexible alert payload, normalizes it, runs
 * the investigation synchronously, stores the result, and returns the diagnosis.
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { normalizeAlert } from "../modules/alerts/normalize";
import { runInvestigation } from "../modules/investigations/orchestrator";
import { investigationStore } from "../modules/investigations/store";
import { logger } from "../logger";

export const webhookRouter = Router();

webhookRouter.post("/webhook/alert", async (req: Request, res: Response) => {
  try {
    const alert = normalizeAlert(req.body);
    logger.info("Webhook received alert", { id: alert.id, name: alert.name });

    const result = await runInvestigation(alert);
    investigationStore.save(alert.id, result);

    res.status(200).json({
      investigationId: alert.id,
      diagnosis: result.diagnosis,
      steps: result.steps,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Webhook investigation failed", { error: message });
    res.status(500).json({ error: message });
  }
});

export default webhookRouter;

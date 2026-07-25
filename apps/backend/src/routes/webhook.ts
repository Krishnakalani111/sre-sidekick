/**
 * POST /webhook/alert — accepts a flexible alert payload, normalizes it, runs
 * the investigation synchronously, stores the result, and returns the diagnosis.
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { normalizeAlert } from "../modules/alerts/normalize";
import { runInvestigation } from "../modules/investigations/orchestrator";
import { investigationStore } from "../modules/investigations/store";
import { saveInvestigation } from "../db/investigationsRepo";
import { getSlackClient } from "../clients/slack";
import { config } from "../config";
import { logger } from "../logger";

export const webhookRouter = Router();

webhookRouter.post("/webhook/alert", async (req: Request, res: Response) => {
  try {
    const alert = normalizeAlert(req.body);
    logger.info("Webhook received alert", { id: alert.id, name: alert.name });

    const result = await runInvestigation(alert);
    investigationStore.save(alert.id, result);
    await saveInvestigation(result, { issue: alert.name });

    // Auto-post the RCA to Slack (best-effort; a Slack failure never fails the request).
    let slack: { channel: string; ts: string } | undefined;
    if (config.slackConfigured) {
      try {
        const ref = await getSlackClient().sendDiagnosis(result.diagnosis, {
          investigationId: alert.id,
          withActions: true,
        });
        slack = { channel: ref.channel, ts: ref.ts };
        logger.info("Posted RCA to Slack", slack);
      } catch (err) {
        logger.warn("Slack auto-post failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    res.status(200).json({
      investigationId: alert.id,
      diagnosis: result.diagnosis,
      steps: result.steps,
      slack,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Webhook investigation failed", { error: message });
    res.status(500).json({ error: message });
  }
});

export default webhookRouter;

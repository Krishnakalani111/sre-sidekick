/**
 * POST /notify/slack[/*] — outbound Slack notifications for any service.
 *
 * Lets non-JS callers (a cron/watcher, another team's service) fire Slack
 * messages over HTTP — the same thing monorepo TS code gets by importing
 * @sre/slack directly. Returns 503 when no SLACK_BOT_TOKEN is configured, so the
 * feature degrades gracefully (mirrors the /stt route).
 *
 *   POST /notify/slack            { channel?, text, blocks?, threadTs? }
 *   POST /notify/slack/alert      { alert, channel?, threadTs? }
 *   POST /notify/slack/diagnosis  { diagnosis, channel?, threadTs?, investigationId?, withActions? }
 *
 * Success → 200 { ok: true, channel, ts }  (the MessageRef, for threading/updates)
 */
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { SlackError } from "@sre/slack";
import { DiagnosisSchema } from "@sre/types";
import { getSlackClient } from "../clients/slack";
import { normalizeAlert } from "../modules/alerts/normalize";
import { logger } from "../logger";

export const notifyRouter = Router();

const SendSchema = z.object({
  channel: z.string().min(1).optional(),
  text: z.string().min(1, "text is required"),
  blocks: z.array(z.any()).optional(),
  threadTs: z.string().optional(),
});

const AlertSchema = z.object({
  alert: z.record(z.any()),
  channel: z.string().min(1).optional(),
  threadTs: z.string().optional(),
});

const DiagnosisBodySchema = z.object({
  diagnosis: DiagnosisSchema,
  channel: z.string().min(1).optional(),
  threadTs: z.string().optional(),
  investigationId: z.string().optional(),
  withActions: z.boolean().optional(),
});

/** Map a zod failure to a 400 with a readable message. */
function badRequest(res: Response, err: z.ZodError): void {
  res.status(400).json({ error: err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ") });
}

notifyRouter.post("/notify/slack", async (req: Request, res: Response, next: NextFunction) => {
  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  try {
    const ref = await getSlackClient().sendMessage(parsed.data);
    res.status(200).json({ ok: true, ...ref });
  } catch (err) {
    next(err);
  }
});

notifyRouter.post("/notify/slack/alert", async (req: Request, res: Response, next: NextFunction) => {
  const parsed = AlertSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  try {
    const alert = normalizeAlert(parsed.data.alert);
    const ref = await getSlackClient().sendAlert(alert, {
      channel: parsed.data.channel,
      threadTs: parsed.data.threadTs,
    });
    logger.info("Slack alert posted", { channel: ref.channel, ts: ref.ts, alert: alert.name });
    res.status(200).json({ ok: true, ...ref });
  } catch (err) {
    next(err);
  }
});

notifyRouter.post("/notify/slack/diagnosis", async (req: Request, res: Response, next: NextFunction) => {
  const parsed = DiagnosisBodySchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  try {
    const ref = await getSlackClient().sendDiagnosis(parsed.data.diagnosis, {
      channel: parsed.data.channel,
      threadTs: parsed.data.threadTs,
      investigationId: parsed.data.investigationId,
      withActions: parsed.data.withActions,
    });
    res.status(200).json({ ok: true, ...ref });
  } catch (err) {
    next(err);
  }
});

// Local error handler — maps SlackError (503 unconfigured, 4xx/5xx Slack API) to
// JSON before it reaches the app-level 500 handler.
notifyRouter.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);
  if (err instanceof SlackError) {
    res.status(err.status).json({ error: err.message, ...(err.code ? { code: err.code } : {}) });
    return;
  }
  next(err);
});

export default notifyRouter;

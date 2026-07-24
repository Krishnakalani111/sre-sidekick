/**
 * POST /investigate — free-text entry point for the Slack bot and the
 * voice/STT path. Body: { query: string } (e.g. "checkout is slow", or a
 * transcribed spoken question). Runs the same investigation pipeline as the
 * webhook, but returns the compact RCA shape those clients render:
 *
 *   { rootCause, confidence, evidence[], suggestedFix, timeline[], ... }
 *
 * Swap target for apps/slack-bot's mockBackend — identical response shape.
 */
import { Router } from "express";
import type { Request, Response } from "express";
import type { Diagnosis, Evidence } from "@sre/types";
import { normalizeAlert } from "../modules/alerts/normalize";
import { runInvestigation } from "../modules/investigations/orchestrator";
import { investigationStore } from "../modules/investigations/store";
import { logger } from "../logger";

export const investigateRouter = Router();

function toRcaResponse(query: string, diagnosis: Diagnosis, evidence: Evidence) {
  const evidenceLines =
    diagnosis.evidenceRefs.length > 0
      ? diagnosis.evidenceRefs
      : diagnosis.contributingFactors.length > 0
        ? diagnosis.contributingFactors
        : ["No specific evidence was captured; review the raw investigation."];

  const top = diagnosis.recommendedActions[0];
  const suggestedFix = top
    ? `${top.title} — ${top.detail}`
    : "No specific remediation identified yet; review the evidence.";

  const timeline = (evidence.timeline ?? []).map((t) => ({
    time: new Date(t.tsMs).toISOString(),
    event: t.summary,
  }));

  return {
    query,
    status: "completed",
    title: diagnosis.title,
    rootCause: diagnosis.rootCause,
    confidence: diagnosis.confidence,
    evidence: evidenceLines,
    suggestedFix,
    affectedServices: diagnosis.affectedServices,
    recommendedActions: diagnosis.recommendedActions,
    timeline,
    verificationStatus: "pending_approval",
  };
}

investigateRouter.post("/investigate", async (req: Request, res: Response) => {
  try {
    const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
    if (!query) {
      return res.status(400).json({ error: "Body must include a non-empty 'query' string." });
    }
    logger.info("Investigate (free-text) received", { query });

    // Turn the free-text question into an alert the pipeline can investigate.
    // No `service` is set — the planner discovers the affected service via
    // list_services, exactly as an on-call engineer would from a vague report.
    const alert = normalizeAlert({
      name: query,
      description: query,
      source: "chat",
      severity: "warning",
    });

    const result = await runInvestigation(alert);
    investigationStore.save(alert.id, result);

    res.status(200).json({
      investigationId: alert.id,
      ...toRcaResponse(query, result.diagnosis, result.evidence),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Investigate failed", { error: message });
    res.status(500).json({ error: message });
  }
});

export default investigateRouter;

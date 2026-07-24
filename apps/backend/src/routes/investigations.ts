/**
 * Investigation history API — powers the dashboard table
 * (detected issue -> RCA -> was it accurate?).
 *
 *   GET   /investigations                 list (newest first, paginated, filterable)
 *   GET   /investigations/:id             one investigation (full detail)
 *   PATCH /investigations/:id/feedback    mark the RCA accurate / inaccurate
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { investigationStore } from "../modules/investigations/store";
import {
  listInvestigations,
  getInvestigation,
  setFeedback,
  type Accuracy,
} from "../db/investigationsRepo";

export const investigationsRouter = Router();

// GET /investigations?limit=&offset=&accuracy=accurate|inaccurate|unverified
investigationsRouter.get("/investigations", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const accRaw = typeof req.query.accuracy === "string" ? req.query.accuracy : undefined;
    const accuracy: Accuracy | undefined =
      accRaw === "accurate" || accRaw === "inaccurate" || accRaw === "unverified"
        ? accRaw
        : undefined;

    const { items, total } = await listInvestigations({ limit, offset, accuracy });
    res.status(200).json({ items, total, limit, offset });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /investigations/:id — DB record; falls back to the in-memory result (which
// also carries the full raw Evidence) when the process still holds it.
investigationsRouter.get("/investigations/:id", async (req: Request, res: Response) => {
  try {
    const record = await getInvestigation(req.params.id);
    const mem = investigationStore.get(req.params.id);
    if (!record && !mem) {
      res.status(404).json({ error: `No investigation found for id '${req.params.id}'` });
      return;
    }
    res.status(200).json({
      ...(record ?? {}),
      evidenceDetail: mem?.evidence,
      steps: record?.steps ?? mem?.steps,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// PATCH /investigations/:id/feedback  body: { accurate: boolean, note?: string }
investigationsRouter.patch("/investigations/:id/feedback", async (req: Request, res: Response) => {
  try {
    const accurate = req.body?.accurate;
    if (typeof accurate !== "boolean") {
      res
        .status(400)
        .json({ error: "Body must include boolean 'accurate' (and optional string 'note')." });
      return;
    }
    const note = typeof req.body?.note === "string" ? req.body.note : undefined;
    const updated = await setFeedback(req.params.id, accurate, note);
    if (!updated) {
      res.status(404).json({ error: `No investigation found for id '${req.params.id}'` });
      return;
    }
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default investigationsRouter;

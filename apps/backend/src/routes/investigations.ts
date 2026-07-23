/**
 * GET /investigations/:id — return a stored investigation result, or 404.
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { investigationStore } from "../modules/investigations/store";

export const investigationsRouter = Router();

investigationsRouter.get("/investigations/:id", (req: Request, res: Response) => {
  const result = investigationStore.get(req.params.id);
  if (!result) {
    res.status(404).json({ error: `No investigation found for id '${req.params.id}'` });
    return;
  }
  res.status(200).json({
    investigationId: result.alert.id,
    alert: result.alert,
    diagnosis: result.diagnosis,
    evidence: result.evidence,
    steps: result.steps,
  });
});

export default investigationsRouter;

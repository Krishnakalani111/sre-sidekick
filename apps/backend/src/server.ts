/**
 * Builds and returns the Express app with all routes wired. Kept separate from
 * `index.ts` so it can be constructed for tests without binding a port.
 */
import express from "express";
import cors from "cors";
import type { Express, NextFunction, Request, Response } from "express";
import { healthRouter } from "./routes/health";
import { webhookRouter } from "./routes/webhook";
import { investigateRouter } from "./routes/investigate";
import { investigationsRouter } from "./routes/investigations";
import { sttRouter } from "./routes/stt";
import { notifyRouter } from "./routes/notify";
import { logger } from "./logger";

export function buildApp(): Express {
  const app = express();

  app.use(cors()); // allow the dashboard (other origin) to call the API
  app.use(express.json({ limit: "2mb" }));

  // Lightweight request logging.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug("HTTP request", { method: req.method, path: req.path });
    next();
  });

  app.use(healthRouter);
  app.use(webhookRouter);
  app.use(investigateRouter);
  app.use(investigationsRouter);
  app.use(sttRouter);
  app.use(notifyRouter);

  // 404 fallback.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  // Error handler.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Unhandled route error", { error: message });
    res.status(500).json({ error: message });
  });

  return app;
}

export default buildApp;

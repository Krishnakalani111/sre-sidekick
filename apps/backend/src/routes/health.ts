/**
 * GET /health — liveness + MCP connectivity + active LLM provider.
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { getMcpClient } from "../clients/mcp";
import { getLLMClient } from "../clients/llm";

export const healthRouter = Router();

healthRouter.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    mcp: getMcpClient().isConnected(),
    provider: getLLMClient().provider,
  });
});

export default healthRouter;

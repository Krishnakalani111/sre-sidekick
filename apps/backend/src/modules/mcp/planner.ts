/**
 * Planner — asks the LLM which MCP tools to call next given the alert, the
 * discovered tool catalog, and the running evidence digest.
 */
import type { Alert, DiscoveredTool, LLMClient, PlannerDecision } from "@sre/types";
import { PlannerDecisionSchema } from "@sre/types";
import { plannerPrompt } from "@sre/prompts";
import { logger } from "../../logger";

export interface PlanStepArgs {
  alert: Alert;
  catalog: DiscoveredTool[];
  evidenceDigest: string;
  step: number;
  maxSteps: number;
  llm: LLMClient;
}

export async function planStep(args: PlanStepArgs): Promise<PlannerDecision> {
  const { alert, catalog, evidenceDigest, step, maxSteps, llm } = args;
  const { system, user } = plannerPrompt({
    alert,
    toolCatalog: catalog,
    evidenceDigest,
    step,
    maxSteps,
  });

  try {
    const raw = await llm.completeJSON<unknown>({
      system,
      messages: [{ role: "user", content: user }],
      json: true,
      temperature: 0,
    });
    return PlannerDecisionSchema.parse(raw);
  } catch (err) {
    logger.error("Planner step failed; stopping investigation", {
      step,
      error: err instanceof Error ? err.message : String(err),
    });
    // Fail safe: no more tool calls, let RCA run on what we have.
    return { reasoning: `Planner error at step ${step}: ${String(err)}`, done: true, toolCalls: [] };
  }
}

export default planStep;

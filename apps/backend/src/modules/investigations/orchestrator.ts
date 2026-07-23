/**
 * Orchestrator — the core agentic investigation loop.
 *
 * runInvestigation(alert):
 *   ensure mcp connected; discover tool catalog
 *   for each step up to MAX_STEPS:
 *     planner decides which tools to call (given the running evidence digest)
 *     executor runs them; collector accumulates typed Evidence + timeline
 *   diagnose(alert, evidence) -> Diagnosis
 *
 * The RCA step is fed the EvidenceCollector's digest/Evidence — never raw MCP
 * responses.
 */
import type {
  Alert,
  Diagnosis,
  DiscoveredTool,
  Evidence,
  PlannerDecision,
} from "@sre/types";
import type { McpClient } from "@sre/mcp-client";
import type { LLMClient } from "@sre/types";
import { config } from "../../config";
import { logger } from "../../logger";
import { getMcpClient } from "../../clients/mcp";
import { getLLMClient } from "../../clients/llm";
import { EvidenceCollector } from "../mcp/evidence";
import { planStep } from "../mcp/planner";
import { execute } from "../mcp/executor";
import { diagnose } from "../rca/diagnose";

/** A record of a single planner step, kept for audit / API responses. */
export interface InvestigationStep {
  step: number;
  reasoning: string;
  done: boolean;
  toolCalls: { tool: string; reason?: string }[];
  resultCount: number;
  okCount: number;
}

export interface InvestigationResult {
  alert: Alert;
  diagnosis: Diagnosis;
  evidence: Evidence;
  steps: InvestigationStep[];
}

export interface RunOptions {
  mcpClient?: McpClient;
  llm?: LLMClient;
  maxSteps?: number;
}

export async function runInvestigation(
  alert: Alert,
  opts: RunOptions = {},
): Promise<InvestigationResult> {
  const mcpClient = opts.mcpClient ?? getMcpClient();
  const llm = opts.llm ?? getLLMClient();
  const maxSteps = opts.maxSteps ?? config.investigationMaxSteps;

  logger.info("Investigation started", { alertId: alert.id, name: alert.name, maxSteps });

  if (!mcpClient.isConnected()) {
    await mcpClient.connect();
  }

  let catalog: DiscoveredTool[] = mcpClient.getTools();
  if (catalog.length === 0) {
    catalog = await mcpClient.listTools();
  }
  logger.info("Tool catalog ready", { toolCount: catalog.length });

  const collector = new EvidenceCollector(alert);
  const steps: InvestigationStep[] = [];

  for (let step = 1; step <= maxSteps; step++) {
    const decision: PlannerDecision = await planStep({
      alert,
      catalog,
      evidenceDigest: collector.digest(),
      step,
      maxSteps,
      llm,
    });

    if (decision.done || decision.toolCalls.length === 0) {
      steps.push(stepRecord(step, decision, 0, 0));
      logger.info("Planner signaled done", { step, reasoning: decision.reasoning });
      break;
    }

    const results = await execute(mcpClient, decision.toolCalls);
    collector.add(results, decision);

    const okCount = results.filter((r) => r.ok).length;
    steps.push(stepRecord(step, decision, results.length, okCount));
    logger.info("Step complete", {
      step,
      tools: decision.toolCalls.map((c) => c.tool),
      okCount,
      total: results.length,
    });
  }

  const evidence = collector.evidence();
  const diagnosis = await diagnose(alert, evidence, llm, collector.digest());

  logger.info("Investigation complete", {
    alertId: alert.id,
    confidence: diagnosis.confidence,
    steps: steps.length,
  });

  return { alert, diagnosis, evidence, steps };
}

function stepRecord(
  step: number,
  decision: PlannerDecision,
  resultCount: number,
  okCount: number,
): InvestigationStep {
  return {
    step,
    reasoning: decision.reasoning,
    done: decision.done,
    toolCalls: decision.toolCalls.map((c) => ({ tool: c.tool, reason: c.reason })),
    resultCount,
    okCount,
  };
}

export default runInvestigation;

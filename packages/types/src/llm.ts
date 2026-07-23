/**
 * LLM abstraction + the structured outputs the pipeline expects from the model:
 * a PlannerDecision (which MCP tools to call next) and a Diagnosis (the RCA).
 */
import { z } from "zod";

export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMCompletionRequest {
  system?: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Ask the provider for JSON output when supported. */
  json?: boolean;
}

export interface LLMUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface LLMResult {
  text: string;
  provider: string;
  model: string;
  raw?: unknown;
  usage?: LLMUsage;
}

/**
 * Provider-agnostic LLM client. Implemented by GeminiClient, GrokClient,
 * MockClient. `completeJSON` returns parsed JSON (robust extraction).
 */
export interface LLMClient {
  provider: string;
  model: string;
  complete(req: LLMCompletionRequest): Promise<LLMResult>;
  completeJSON<T = unknown>(req: LLMCompletionRequest): Promise<T>;
}

// ---------------------------------------------------------------------------
// Planner structured output
// ---------------------------------------------------------------------------

export const PlannerToolCallSchema = z.object({
  /** Name of a tool discovered from the SigNoz MCP server (e.g. "signoz_query_metrics"). */
  tool: z.string(),
  input: z.record(z.any()).default({}),
  reason: z.string().optional(),
});
export type PlannerToolCall = z.infer<typeof PlannerToolCallSchema>;

export const PlannerDecisionSchema = z.object({
  /** The planner's short reasoning about what it knows and needs next. */
  reasoning: z.string(),
  /** Set true when enough evidence has been gathered to diagnose. */
  done: z.boolean(),
  /** Tool calls to run this step (empty when done). */
  toolCalls: z.array(PlannerToolCallSchema).default([]),
});
export type PlannerDecision = z.infer<typeof PlannerDecisionSchema>;

// ---------------------------------------------------------------------------
// Diagnosis (final RCA output)
// ---------------------------------------------------------------------------

export const RecommendedActionSchema = z.object({
  title: z.string(),
  detail: z.string(),
  risk: z.enum(["low", "medium", "high"]).default("medium"),
  requiresApproval: z.boolean().default(true),
});
export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;

export const DiagnosisSchema = z.object({
  title: z.string(),
  summary: z.string(),
  rootCause: z.string(),
  confidence: z.number().min(0).max(1),
  contributingFactors: z.array(z.string()).default([]),
  affectedServices: z.array(z.string()).default([]),
  /** References into the evidence (trace ids, log snippets, metric names). */
  evidenceRefs: z.array(z.string()).default([]),
  recommendedActions: z.array(RecommendedActionSchema).default([]),
});
export type Diagnosis = z.infer<typeof DiagnosisSchema>;

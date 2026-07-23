import type {
  Diagnosis,
  LLMClient,
  LLMCompletionRequest,
  LLMResult,
  PlannerDecision,
} from "@sre/types";
import { extractJson } from "./json";

/**
 * Fully offline, deterministic LLMClient. It never touches the network — it
 * inspects the prompt text to decide whether it's being asked to PLAN
 * (choose MCP tools) or to DIAGNOSE (produce an RCA), and returns JSON that
 * matches PlannerDecisionSchema / DiagnosisSchema respectively.
 *
 * Classification and planning are driven by STABLE markers only (the JSON
 * output-contract keys embedded in each system prompt, and the "Investigation
 * step N of M" line), never by scanning for words like "error rate"/"p99" —
 * those appear in the rendered tool catalog and would misfire.
 */
export class MockClient implements LLMClient {
  readonly provider = "mock";
  readonly model: string;

  constructor(opts?: { model?: string }) {
    this.model = opts?.model || "mock-sre-1";
  }

  async complete(req: LLMCompletionRequest): Promise<LLMResult> {
    const obj = this.decide(req);
    return {
      text: JSON.stringify(obj, null, 2),
      provider: this.provider,
      model: this.model,
      raw: obj,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  async completeJSON<T = unknown>(req: LLMCompletionRequest): Promise<T> {
    const result = await this.complete({ ...req, json: true });
    return extractJson<T>(result.text);
  }

  // ---- internals ---------------------------------------------------------

  private promptText(req: LLMCompletionRequest): string {
    return [req.system ?? "", ...req.messages.map((m) => m.content)].join("\n");
  }

  private decide(req: LLMCompletionRequest): PlannerDecision | Diagnosis {
    const text = this.promptText(req);

    // Stable markers: the diagnosis system prompt embeds the "recommendedActions"
    // key and the user prompt says "Produce the diagnosis"; the planner embeds
    // "toolCalls" and the "Investigation step N of M" line.
    const isDiagnosis =
      text.includes('"recommendedActions"') || /produce the diagnosis/i.test(text);
    const isPlanner =
      /investigation step\s+\d+\s+of\s+\d+/i.test(text) || text.includes('"toolCalls"');

    if (isDiagnosis && !isPlanner) return this.diagnose(text);
    if (isPlanner && !isDiagnosis) return this.plan(text);
    // If both/neither: a diagnosis prompt is the only one asking for an RCA,
    // and it's the terminal step, so prefer it when its marker is present.
    if (isDiagnosis) return this.diagnose(text);
    if (isPlanner) return this.plan(text);

    return {
      reasoning: "Mock client could not classify the request; terminating.",
      done: true,
      toolCalls: [],
    };
  }

  private plan(text: string): PlannerDecision {
    const stepMatch = text.match(/step\s+(\d+)\s+of\s+(\d+)/i);
    const step = stepMatch ? Number(stepMatch[1]) : 1;
    const isFinalStep = /final step/i.test(text);

    // Deterministic, step-driven investigation that always exercises the full
    // MCP path (services -> traces -> logs -> metrics) before diagnosing.
    if (isFinalStep || step >= 3) {
      return {
        reasoning:
          "Gathered service health, error traces with exceptions, correlated error logs and the latency trend. Enough to diagnose.",
        done: true,
        toolCalls: [],
      };
    }

    if (step <= 1) {
      return {
        reasoning:
          "No evidence yet. Enumerate services in the alert window and pull error traces on the affected service to localize the failure.",
        done: false,
        toolCalls: [
          {
            tool: "signoz_list_services",
            input: { lookbackMinutes: 30 },
            reason: "Establish which services are active and unhealthy in the alert window.",
          },
          {
            tool: "signoz_search_traces",
            input: { service: "gateway", status: "error", limit: 20, lookbackMinutes: 30 },
            reason: "Find error traces correlated with the alert to localize the failing span.",
          },
        ],
      };
    }

    // step 2: confirm the failure mode via logs + quantify with the latency metric.
    return {
      reasoning:
        "Have services and error traces; now confirm the exception behind them and quantify the latency/error trend.",
      done: false,
      toolCalls: [
        {
          tool: "signoz_search_logs",
          input: { service: "gateway", severity: "error", limit: 50, lookbackMinutes: 30 },
          reason: "Confirm the exception type/message behind the error traces (log↔trace correlation).",
        },
        {
          tool: "signoz_query_metrics",
          input: { metric: "latency_p99", service: "gateway", aggregation: "p99", lookbackMinutes: 30 },
          reason: "Quantify the latency trend across the incident window.",
        },
      ],
    };
  }

  private diagnose(text: string): Diagnosis {
    const svcMatch =
      text.match(/^-?\s*service[\s"']*[:=][\s"']*([a-zA-Z0-9_.-]+)/im) ||
      text.match(/"service"\s*:\s*"([^"]+)"/i);
    const service = svcMatch ? svcMatch[1] : "gateway";

    // Ground the RCA in whatever numbers the evidence digest surfaced.
    const errMatch = text.match(/(\d+(?:\.\d+)?)\s*%[^%]{0,24}error|error[^%\n]{0,24}?(\d+(?:\.\d+)?)\s*%/i);
    const errorRate = errMatch ? (errMatch[1] ?? errMatch[2]) : undefined;
    const p99Match = text.match(/p99[^0-9]{0,24}(\d{2,6})\s*ms/i);
    const p99 = p99Match ? p99Match[1] : undefined;

    const observed = [
      errorRate ? `error rate ≈ ${errorRate}%` : null,
      p99 ? `p99 latency ≈ ${p99}ms` : null,
    ]
      .filter(Boolean)
      .join(", ");

    return {
      title: `Elevated error rate on ${service} from a failing downstream dependency`,
      summary:
        `${service} started returning 5xx responses when the alert fired${observed ? ` (${observed})` : ""}. ` +
        `Error traces show failed downstream spans and the error logs (correlated by trace_id) point to ` +
        `timeouts/connection failures against a dependency.`,
      rootCause:
        `A downstream dependency of ${service} became unavailable (connection refused / timeout), causing ` +
        `requests to fail and error rate/latency to breach the alert threshold.`,
      confidence: 0.74,
      contributingFactors: [
        "No timeout / circuit breaker on the downstream call path, so failures piled up",
        "Error rate and p99 latency breached threshold together, consistent with dependency stalls",
      ],
      affectedServices: [service],
      evidenceRefs: [
        "traces: error spans with exception messages",
        "logs: severity=error correlated by trace_id",
        "metric: latency_p99 rising across the window",
      ],
      recommendedActions: [
        {
          title: `Restore or fail over the downstream dependency for ${service}`,
          detail:
            "Verify the dependency's health, restart/scale it or route to a healthy replica, then confirm error rate returns to baseline.",
          risk: "medium",
          requiresApproval: true,
        },
        {
          title: "Add timeouts, retries with backoff, and a circuit breaker",
          detail:
            "Bound call latency and shed load when the dependency is unhealthy so a single failure cannot cascade.",
          risk: "low",
          requiresApproval: true,
        },
      ],
    };
  }
}

/**
 * RCA — turns the collected Evidence into a structured Diagnosis via the LLM.
 * Receives ONLY the Evidence bundle (never raw MCP responses); the digest is
 * built from the Evidence here.
 */
import type { Alert, Diagnosis, Evidence, LLMClient } from "@sre/types";
import { DiagnosisSchema } from "@sre/types";
import { diagnosisPrompt } from "@sre/prompts";
import { EvidenceCollector } from "../mcp/evidence";
import { logger } from "../../logger";

export async function diagnose(
  alert: Alert,
  evidence: Evidence,
  llm: LLMClient,
  evidenceDigest?: string,
): Promise<Diagnosis> {
  // Reconstruct a digest from the Evidence if one wasn't supplied.
  const digest = evidenceDigest ?? rebuildDigest(evidence);
  const { system, user } = diagnosisPrompt({ alert, evidenceDigest: digest });

  try {
    const raw = await llm.completeJSON<unknown>({
      system,
      messages: [{ role: "user", content: user }],
      json: true,
      temperature: 0,
    });
    return DiagnosisSchema.parse(raw);
  } catch (err) {
    logger.error("Diagnosis failed; returning low-confidence fallback", {
      error: err instanceof Error ? err.message : String(err),
    });
    return DiagnosisSchema.parse({
      title: `Inconclusive: ${alert.name}`,
      summary:
        "The RCA step could not produce a structured diagnosis. Review the collected evidence manually.",
      rootCause: "Unknown — diagnosis step failed or returned invalid output.",
      confidence: 0,
      affectedServices: alert.service ? [alert.service] : [],
      evidenceRefs: evidence.toolCalls.map((t) => t.tool).slice(0, 10),
    });
  }
}

/** Build a digest from an Evidence bundle by replaying it through a collector. */
function rebuildDigest(evidence: Evidence): string {
  const collector = new EvidenceCollector(evidence.alert);
  collector.add(evidence.toolCalls);
  return collector.digest();
}

export default diagnose;

/**
 * Renders a Diagnosis as Markdown for clients that display prose rather than
 * building their own layout (the dashboard UI).
 *
 * Deterministic string assembly — no LLM call, so it costs nothing and can't
 * hallucinate structure. Opt in with `{ "format": "markdown" }` on
 * POST /investigate; the structured fields are returned either way.
 *
 * NOTE: this is CommonMark, not Slack's mrkdwn (which has no headings and uses
 * single-asterisk bold). Don't feed the output to the Slack bot.
 */
import type { Diagnosis, Evidence } from "@sre/types";

/**
 * Escape the characters that would otherwise be read as Markdown syntax.
 *
 * Deliberately excludes `_`: CommonMark ignores intra-word underscores, and
 * escaping them would litter every `trace_id`, `latency_p99` and `signoz_*`
 * tool name with backslashes — the identifiers this output is mostly made of.
 */
function escape(text: string): string {
  return text.replace(/([\\`*[\]<>])/g, "\\$1");
}

export interface MarkdownParts {
  evidenceLines: string[];
  suggestedFix: string;
  timeline: Array<{ time: string; event: string }>;
}

/**
 * Build the Markdown document. Takes the already-derived response parts so the
 * prose and the JSON fields can never drift apart.
 */
export function diagnosisToMarkdown(
  diagnosis: Diagnosis,
  parts: MarkdownParts,
): string {
  const { evidenceLines, suggestedFix, timeline } = parts;
  const confidence = Math.round(diagnosis.confidence * 100);
  const out: string[] = [];

  out.push(`## ${escape(diagnosis.title)}`);
  out.push("");

  if (diagnosis.summary) {
    out.push(escape(diagnosis.summary));
    out.push("");
  }

  out.push(`**Confidence:** ${confidence}%`);
  if (diagnosis.affectedServices.length > 0) {
    out.push(
      `**Affected services:** ${diagnosis.affectedServices.map((s) => `\`${s}\``).join(", ")}`,
    );
  }
  out.push("");

  out.push("### Root cause");
  out.push(escape(diagnosis.rootCause));
  out.push("");

  if (evidenceLines.length > 0) {
    out.push("### Evidence");
    for (const line of evidenceLines) out.push(`- ${escape(line)}`);
    out.push("");
  }

  if (diagnosis.contributingFactors.length > 0) {
    out.push("### Contributing factors");
    for (const factor of diagnosis.contributingFactors) out.push(`- ${escape(factor)}`);
    out.push("");
  }

  if (suggestedFix) {
    out.push("### Suggested fix");
    out.push(escape(suggestedFix));
    out.push("");
  }

  if (diagnosis.recommendedActions.length > 0) {
    out.push("### Recommended actions");
    for (const action of diagnosis.recommendedActions) {
      const approval = action.requiresApproval ? ", needs approval" : "";
      out.push(`- **${escape(action.title)}** _(${action.risk} risk${approval})_`);
      out.push(`  ${escape(action.detail)}`);
    }
    out.push("");
  }

  if (timeline.length > 0) {
    out.push("### Timeline");
    for (const entry of timeline) out.push(`- \`${entry.time}\` — ${escape(entry.event)}`);
    out.push("");
  }

  // Trailing newline, no double blank line at the end.
  return `${out.join("\n").trimEnd()}\n`;
}

/** Convenience for callers that only hold the raw Evidence object. */
export function timelineFromEvidence(evidence: Evidence): Array<{ time: string; event: string }> {
  return (evidence.timeline ?? []).map((t) => ({
    time: new Date(t.tsMs).toISOString(),
    event: t.summary,
  }));
}

/**
 * @sre/prompts — prompt templates for the SRE RCA pipeline.
 *
 * Three templates: the PLANNER (decides which SigNoz MCP tools to call next),
 * the DIAGNOSIS (produces the structured RCA), and the INCIDENT REPORT
 * (renders a human-readable postmortem from a diagnosis). Each returns a
 * `{ system, user }` pair ready to hand to an LLMClient.
 */
import type { Alert, DiscoveredTool } from "@sre/types";

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

function renderAlert(alert: Alert): string {
  const lines: string[] = [];
  lines.push(`- id: ${alert.id}`);
  lines.push(`- name: ${alert.name}`);
  if (alert.description) lines.push(`- description: ${alert.description}`);
  lines.push(`- severity: ${alert.severity}`);
  lines.push(`- source: ${alert.source}`);
  if (alert.service) lines.push(`- service: ${alert.service}`);
  lines.push(`- startsAt: ${new Date(alert.startsAtMs).toISOString()} (${alert.startsAtMs}ms)`);
  if (alert.endsAtMs) {
    lines.push(`- endsAt: ${new Date(alert.endsAtMs).toISOString()} (${alert.endsAtMs}ms)`);
  }
  if (alert.threshold) {
    const t = alert.threshold;
    const parts = [
      t.metric ? `metric=${t.metric}` : null,
      t.op ? `op=${t.op}` : null,
      t.value !== undefined ? `value=${t.value}` : null,
      t.observed !== undefined ? `observed=${t.observed}` : null,
    ].filter(Boolean);
    if (parts.length) lines.push(`- threshold: ${parts.join(", ")}`);
  }
  const labels = Object.entries(alert.labels ?? {});
  if (labels.length) {
    lines.push(`- labels: ${labels.map(([k, v]) => `${k}=${v}`).join(", ")}`);
  }
  const anns = Object.entries(alert.annotations ?? {});
  if (anns.length) {
    lines.push(`- annotations: ${anns.map(([k, v]) => `${k}=${v}`).join(", ")}`);
  }
  return lines.join("\n");
}

function renderSchema(schema?: Record<string, unknown>): string {
  if (!schema) return "       (no input schema advertised)";
  // JSON Schema objects put field names under `properties`.
  const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!props || Object.keys(props).length === 0) return "       (no inputs)";
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  const lines: string[] = [];
  for (const [name, raw] of Object.entries(props)) {
    const s = (raw ?? {}) as Record<string, unknown>;
    const type = typeof s.type === "string" ? (s.type as string) : Array.isArray(s.enum) ? "enum" : "any";
    const req = required.includes(name) ? " REQUIRED" : "";
    const en = Array.isArray(s.enum) ? ` enum:[${(s.enum as unknown[]).join(", ")}]` : "";
    const def = s.default !== undefined ? ` default:${JSON.stringify(s.default)}` : "";
    const desc = typeof s.description === "string"
      ? ` — ${s.description.replace(/\s+/g, " ").trim().slice(0, 160)}`
      : "";
    lines.push(`       - ${name} (${type})${req}${en}${def}${desc}`);
  }
  return lines.join("\n");
}

function renderToolCatalog(tools: DiscoveredTool[]): string {
  if (!tools || tools.length === 0) {
    return "(no tools available — you must set done:true)";
  }
  return tools
    .map((t, i) => {
      const desc = t.description ? t.description.replace(/\s+/g, " ").trim() : "(no description)";
      return `${i + 1}. ${t.name} — ${desc}\n     inputs:\n${renderSchema(t.inputSchema)}`;
    })
    .join("\n\n");
}

function renderDigest(evidenceDigest: string): string {
  const d = (evidenceDigest ?? "").trim();
  return d.length > 0 ? d : "(no evidence collected yet)";
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

export function plannerPrompt(a: {
  alert: Alert;
  toolCatalog: DiscoveredTool[];
  evidenceDigest: string;
  step: number;
  maxSteps: number;
}): { system: string; user: string } {
  const system = [
    "You are an expert Site Reliability Engineer performing automated root-cause analysis.",
    "You investigate incidents by calling observability tools exposed by a SigNoz MCP server",
    "(traces, logs, metrics, service maps). You work iteratively: at each step you review the",
    "evidence gathered so far and decide which tool(s) to call next to close the biggest gap in",
    "your understanding. Prefer a small number of high-signal calls per step.",
    "",
    "Investigation strategy:",
    "- Start broad (which services are affected, error rates, latency) then drill into specifics",
    "  (error traces, exception logs, deploy/metric timelines).",
    "- Correlate signals across traces, logs and metrics around the alert window.",
    "- Only choose tool names that appear in the provided tool catalog, and only pass inputs that",
    "  match the tool's advertised input schema.",
    "- Stop as soon as you have enough evidence to explain the root cause. You MUST respect the",
    "  step budget: if this is the last step, set done:true.",
    "",
    "TOOL INPUT RULES — follow exactly or the call fails:",
    "- Include every REQUIRED field, and use enum values VERBATIM (they are case-sensitive,",
    '  e.g. "time_series" not "TIME_SERIES"; "count" not "COUNT").',
    "- For time windows, PREFER a relative window via a `timeRange` field (e.g. \"1h\", \"24h\", \"30m\")",
    "  when the schema offers it. If you must pass explicit `start`/`end`, they MUST be unix epoch",
    "  MILLISECONDS as integers (e.g. 1711130400000) — NEVER ISO-8601 strings like \"2026-07-23T11:00:00Z\".",
    "- Match field names to the schema precisely; do not invent parameters.",
    "- Every SigNoz tool accepts a `searchContext` string — ALWAYS set it to a concise restatement",
    "  of the alert/incident under investigation (service, symptom, window). It sharpens results.",
    "",
    "OUTPUT CONTRACT — reply with JSON ONLY (no prose, no markdown fences), matching exactly:",
    "{",
    '  "reasoning": string,   // brief: what you know and what gap you are closing next',
    '  "done": boolean,       // true when you have enough evidence to diagnose',
    '  "toolCalls": [         // the tool calls to run this step; empty array when done',
    '    { "tool": string, "input": object, "reason": string }',
    "  ]",
    "}",
  ].join("\n");

  const lastStep = a.step >= a.maxSteps;
  const user = [
    `## Investigation step ${a.step} of ${a.maxSteps}`,
    lastStep
      ? "This is the FINAL step of your budget — you must set done:true and return an empty toolCalls array."
      : "Decide the next tool call(s), or set done:true if the evidence already explains the incident.",
    "",
    "## Alert",
    renderAlert(a.alert),
    "",
    "## Tool catalog (choose `tool` names ONLY from this list)",
    renderToolCatalog(a.toolCatalog),
    "",
    "## Evidence collected so far",
    renderDigest(a.evidenceDigest),
    "",
    "Respond now with the JSON decision object described in the system prompt.",
  ].join("\n");

  return { system, user };
}

// ---------------------------------------------------------------------------
// Diagnosis
// ---------------------------------------------------------------------------

export function diagnosisPrompt(a: {
  alert: Alert;
  evidenceDigest: string;
}): { system: string; user: string } {
  const system = [
    "You are an expert Site Reliability Engineer writing the root-cause analysis (RCA) for an",
    "incident. You are given an alert and the full evidence collected from SigNoz (services,",
    "traces, logs, metrics, timeline). Reason carefully and ground every claim in the evidence —",
    "do not invent data. If the evidence is inconclusive, say so and lower your confidence.",
    "",
    "OUTPUT CONTRACT — reply with JSON ONLY (no prose, no markdown fences), matching exactly:",
    "{",
    '  "title": string,               // one-line incident title',
    '  "summary": string,             // 2-4 sentence executive summary',
    '  "rootCause": string,           // the most likely root cause, grounded in the evidence',
    '  "confidence": number,          // 0..1, your confidence in the root cause',
    '  "contributingFactors": string[],',
    '  "affectedServices": string[],',
    '  "evidenceRefs": string[],      // references into the evidence (trace ids, log snippets, metric names)',
    '  "recommendedActions": [',
    '    { "title": string, "detail": string, "risk": "low"|"medium"|"high", "requiresApproval": boolean }',
    "  ]",
    "}",
  ].join("\n");

  const user = [
    "## Alert",
    renderAlert(a.alert),
    "",
    "## Evidence",
    renderDigest(a.evidenceDigest),
    "",
    "Produce the diagnosis now as the JSON object described in the system prompt.",
  ].join("\n");

  return { system, user };
}

// ---------------------------------------------------------------------------
// Incident report (human-readable postmortem)
// ---------------------------------------------------------------------------

export function incidentReportPrompt(a: {
  alert: Alert;
  diagnosisJson: string;
}): { system: string; user: string } {
  const system = [
    "You are an expert Site Reliability Engineer writing a clear, blameless incident report",
    "(postmortem) for both engineers and stakeholders. You are given the original alert and a",
    "structured diagnosis (JSON). Turn them into a well-organized Markdown report.",
    "",
    "Use these sections, in order:",
    "1. Title (H1)",
    "2. Summary — what happened, impact, and current status",
    "3. Root Cause",
    "4. Contributing Factors",
    "5. Affected Services",
    "6. Timeline / Evidence — cite the evidence references",
    "7. Recommended Actions — as a checklist, noting risk and whether approval is required",
    "8. Confidence — the diagnosis confidence and any caveats",
    "",
    "Be concise and factual. Do not invent details beyond the alert and diagnosis. Output Markdown only.",
  ].join("\n");

  const user = [
    "## Alert",
    renderAlert(a.alert),
    "",
    "## Diagnosis (JSON)",
    "```json",
    a.diagnosisJson.trim(),
    "```",
    "",
    "Write the incident report now as Markdown.",
  ].join("\n");

  return { system, user };
}

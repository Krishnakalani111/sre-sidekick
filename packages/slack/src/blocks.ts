/**
 * Block Kit builders for the alert → investigate → diagnosis → resolve lifecycle.
 *
 * Exported so consumers can compose their own messages. Layout mirrors the
 * interactive bot's rcaToBlocks (apps/slack-bot/src/app.js) but is driven off the
 * typed @sre/types shapes (Alert, Diagnosis, RecommendedAction).
 */
import type { KnownBlock } from "@slack/web-api";
import type { Alert, Diagnosis, RecommendedAction, Severity } from "@sre/types";
import { ACTION_IDS } from "./types";

/** Block Kit caps: header ≤150 chars, section text ≤3000. Keep some headroom. */
const MAX_HEADER = 150;
const MAX_SECTION = 2900;
/** Cap long lists so we never blow past the ~50-block / long-text limits. */
const MAX_BULLETS = 10;

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function header(text: string): KnownBlock {
  return { type: "header", text: { type: "plain_text", text: truncate(text, MAX_HEADER), emoji: true } };
}

function section(text: string): KnownBlock {
  return { type: "section", text: { type: "mrkdwn", text: truncate(text, MAX_SECTION) } };
}

function context(text: string): KnownBlock {
  return { type: "context", elements: [{ type: "mrkdwn", text: truncate(text, MAX_SECTION) }] };
}

function bulletList(items: string[]): string {
  const shown = items.slice(0, MAX_BULLETS).map((i) => `• ${i}`);
  if (items.length > MAX_BULLETS) shown.push(`• …${items.length - MAX_BULLETS} more`);
  return shown.join("\n");
}

/** Leading emoji used in headers/context to convey severity (Block Kit has no color on sections). */
export function severityEmoji(sev: Severity): string {
  switch (sev) {
    case "critical":
      return "🔴";
    case "warning":
      return "🟠";
    default:
      return "🔵";
  }
}

/** Hex color per severity — handy if a caller builds classic attachments. */
export function severityColor(sev: Severity): string {
  switch (sev) {
    case "critical":
      return "#E01E5A";
    case "warning":
      return "#ECB22E";
    default:
      return "#36C5F0";
  }
}

/** 0..1 → "High (87%)" / "Medium (63%)" / "Low (20%)". */
export function confidenceLabel(confidence: number): string {
  const clamped = Math.max(0, Math.min(1, confidence));
  const pct = Math.round(clamped * 100);
  const band = clamped >= 0.8 ? "High" : clamped >= 0.5 ? "Medium" : "Low";
  return `${band} (${pct}%)`;
}

/** The anomaly/alert card a watcher fires when it trips. */
export function alertToBlocks(alert: Alert): KnownBlock[] {
  const blocks: KnownBlock[] = [header(`${severityEmoji(alert.severity)} ${alert.name}`)];
  if (alert.description) blocks.push(section(alert.description));

  const fields: string[] = [`*Severity:* ${alert.severity}`, `*Source:* ${alert.source}`];
  if (alert.service) fields.push(`*Service:* ${alert.service}`);
  if (alert.threshold) {
    const t = alert.threshold;
    const cond = [t.metric, t.op, t.value].filter((x) => x !== undefined && x !== "").join(" ");
    const obs = t.observed !== undefined ? ` (observed ${t.observed})` : "";
    if (cond || obs) fields.push(`*Threshold:* ${cond}${obs}`);
  }
  blocks.push({ type: "section", fields: fields.map((f) => ({ type: "mrkdwn", text: truncate(f, 2000) })) });
  blocks.push(context(`Started ${new Date(alert.startsAtMs).toISOString()} · id \`${alert.id}\``));
  return blocks;
}

/** A lightweight "we're on it" ack; returns blocks you can updateMessage() later. */
export function investigationStartedBlocks(alert: Alert): KnownBlock[] {
  const on = alert.service ? ` on \`${alert.service}\`` : "";
  return [
    section(`:mag: *Investigating* ${severityEmoji(alert.severity)} *${alert.name}*${on}…`),
    context(`Triggered by ${alert.source} · ${new Date(alert.startsAtMs).toISOString()}`),
  ];
}

/** The RCA card: root cause, confidence, evidence, affected services, actions. */
export function diagnosisToBlocks(
  diagnosis: Diagnosis,
  opts: { withActions?: boolean; investigationId?: string } = {},
): KnownBlock[] {
  const blocks: KnownBlock[] = [
    header(diagnosis.title),
    section(`*Root Cause:* ${diagnosis.rootCause}\n*Confidence:* ${confidenceLabel(diagnosis.confidence)}`),
  ];
  if (diagnosis.summary) blocks.push(section(diagnosis.summary));

  const evidence = diagnosis.evidenceRefs.length ? diagnosis.evidenceRefs : diagnosis.contributingFactors;
  if (evidence.length) blocks.push(section(`*Evidence:*\n${bulletList(evidence)}`));

  if (diagnosis.affectedServices.length) {
    blocks.push(context(`*Affected:* ${diagnosis.affectedServices.join(", ")}`));
  }

  const withActions = opts.withActions ?? true;
  if (withActions && diagnosis.recommendedActions.length) {
    blocks.push(...recommendedActionsToBlocks(diagnosis.recommendedActions, { investigationId: opts.investigationId }));
  }
  return blocks;
}

/** Recommended actions with Approve Fix / Dismiss buttons. */
export function recommendedActionsToBlocks(
  actions: RecommendedAction[],
  opts: { investigationId?: string } = {},
): KnownBlock[] {
  if (!actions.length) return [];

  const blocks: KnownBlock[] = [{ type: "divider" }, section("*Recommended Actions:*")];
  for (const a of actions.slice(0, MAX_BULLETS)) {
    blocks.push(section(`*${a.title}* _(risk: ${a.risk})_\n${a.detail}`));
  }

  const value = opts.investigationId ? JSON.stringify({ investigationId: opts.investigationId }) : undefined;
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "Approve Fix", emoji: true },
        style: "primary",
        action_id: ACTION_IDS.APPROVE_FIX,
        ...(value ? { value } : {}),
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Dismiss", emoji: true },
        action_id: ACTION_IDS.DISMISS_FIX,
        ...(value ? { value } : {}),
      },
    ],
  });
  return blocks;
}

/** Card that replaces an alert/ack message once the incident is resolved. */
export function resolvedBlocks(note?: string): KnownBlock[] {
  return [section(`:white_check_mark: *Resolved*${note ? ` — ${note}` : ""}`)];
}

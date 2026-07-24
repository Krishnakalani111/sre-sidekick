/**
 * Data access for the detected-issue / RCA / accuracy history that powers the
 * dashboard table. Backed by Postgres (pool.ts). All writes are best-effort:
 * if the DB is down they no-op with a log, so the investigation response to the
 * caller is never blocked by persistence.
 */
import { pool, dbReady } from "./pool";
import { logger } from "../logger";
import type { InvestigationResult } from "../modules/investigations/orchestrator";

export type Accuracy = "accurate" | "inaccurate" | "unverified";

/** One row as returned to the dashboard. */
export interface InvestigationRecord {
  id: string;
  createdAt: string;
  source: string | null;
  issue: string | null;
  service: string | null;
  severity: string | null;
  title: string | null;
  rootCause: string | null;
  confidence: number | null;
  evidence: string[];
  suggestedFix: string | null;
  affectedServices: string[];
  recommendedActions: unknown[];
  steps: unknown[];
  accuracy: Accuracy;
  feedbackNote: string | null;
  feedbackAt: string | null;
}

const LIST_COLUMNS = `
  id, created_at AS "createdAt", source, issue, service, severity, title,
  root_cause AS "rootCause", confidence, evidence, suggested_fix AS "suggestedFix",
  affected_services AS "affectedServices", accuracy, feedback_note AS "feedbackNote",
  feedback_at AS "feedbackAt"`;

const FULL_COLUMNS = `${LIST_COLUMNS}, recommended_actions AS "recommendedActions", steps`;

/** Persist (upsert) an investigation. `issue` = alert name or the free-text query. */
export async function saveInvestigation(
  result: InvestigationResult,
  opts: { issue: string; source?: string },
): Promise<void> {
  if (!dbReady()) return;
  const { alert, diagnosis, steps } = result;
  const top = diagnosis.recommendedActions[0];
  const suggestedFix = top ? `${top.title} — ${top.detail}` : null;
  const service = diagnosis.affectedServices[0] ?? alert.service ?? null;

  try {
    await pool.query(
      `INSERT INTO investigations
         (id, source, issue, service, severity, title, root_cause, confidence,
          evidence, suggested_fix, affected_services, recommended_actions, steps, diagnosis)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         issue = EXCLUDED.issue, service = EXCLUDED.service, title = EXCLUDED.title,
         root_cause = EXCLUDED.root_cause, confidence = EXCLUDED.confidence,
         evidence = EXCLUDED.evidence, suggested_fix = EXCLUDED.suggested_fix,
         affected_services = EXCLUDED.affected_services,
         recommended_actions = EXCLUDED.recommended_actions, steps = EXCLUDED.steps,
         diagnosis = EXCLUDED.diagnosis`,
      [
        alert.id,
        opts.source ?? alert.source,
        opts.issue,
        service,
        alert.severity,
        diagnosis.title,
        diagnosis.rootCause,
        diagnosis.confidence,
        JSON.stringify(diagnosis.evidenceRefs ?? []),
        suggestedFix,
        JSON.stringify(diagnosis.affectedServices ?? []),
        JSON.stringify(diagnosis.recommendedActions ?? []),
        JSON.stringify(steps ?? []),
        JSON.stringify(diagnosis),
      ],
    );
  } catch (err) {
    logger.warn("Failed to persist investigation", {
      id: alert.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export interface ListOptions {
  limit: number;
  offset: number;
  accuracy?: Accuracy;
}

/** List investigations for the dashboard table (newest first). */
export async function listInvestigations(
  opts: ListOptions,
): Promise<{ items: InvestigationRecord[]; total: number }> {
  if (!dbReady()) return { items: [], total: 0 };
  const params: unknown[] = [];
  let where = "";
  if (opts.accuracy) {
    params.push(opts.accuracy);
    where = `WHERE accuracy = $1`;
  }
  const items = await pool.query(
    `SELECT ${LIST_COLUMNS} FROM investigations ${where}
     ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, opts.limit, opts.offset],
  );
  const count = await pool.query(`SELECT count(*)::int AS n FROM investigations ${where}`, params);
  return { items: items.rows as InvestigationRecord[], total: count.rows[0].n as number };
}

/** Fetch one investigation (full detail). */
export async function getInvestigation(id: string): Promise<InvestigationRecord | null> {
  if (!dbReady()) return null;
  const r = await pool.query(`SELECT ${FULL_COLUMNS} FROM investigations WHERE id = $1`, [id]);
  return (r.rows[0] as InvestigationRecord) ?? null;
}

/** Record whether the RCA was accurate. Returns the updated row, or null if not found. */
export async function setFeedback(
  id: string,
  accurate: boolean,
  note?: string,
): Promise<InvestigationRecord | null> {
  if (!dbReady()) return null;
  const accuracy: Accuracy = accurate ? "accurate" : "inaccurate";
  const r = await pool.query(
    `UPDATE investigations
       SET accuracy = $2, feedback_note = $3, feedback_at = now()
     WHERE id = $1
     RETURNING ${FULL_COLUMNS}`,
    [id, accuracy, note ?? null],
  );
  return (r.rows[0] as InvestigationRecord) ?? null;
}

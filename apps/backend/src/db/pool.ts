/**
 * Postgres connection pool + schema bootstrap. The dashboard's
 * detected-issue / RCA / accuracy table is persisted here (dockerized Postgres,
 * see docker-compose.yml). If the DB is unreachable the backend still serves;
 * persistence is simply disabled (logged) so dev without Postgres still works.
 */
import pg from "pg";
import { config } from "../config";
import { logger } from "../logger";

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 5 });

let ready = false;
export function dbReady(): boolean {
  return ready;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS investigations (
  id                  text PRIMARY KEY,
  created_at          timestamptz NOT NULL DEFAULT now(),
  source              text,
  issue               text,               -- the detected issue (alert name or free-text query)
  service             text,
  severity            text,
  title               text,
  root_cause          text,
  confidence          real,               -- 0..1
  evidence            jsonb NOT NULL DEFAULT '[]',
  suggested_fix       text,
  affected_services   jsonb NOT NULL DEFAULT '[]',
  recommended_actions jsonb NOT NULL DEFAULT '[]',
  steps               jsonb NOT NULL DEFAULT '[]',
  diagnosis           jsonb,
  accuracy            text NOT NULL DEFAULT 'unverified',  -- accurate | inaccurate | unverified
  feedback_note       text,
  feedback_at         timestamptz
);
CREATE INDEX IF NOT EXISTS idx_investigations_created_at ON investigations (created_at DESC);
`;

export async function initDb(): Promise<void> {
  try {
    await pool.query(SCHEMA);
    ready = true;
    logger.info("Postgres connected; investigations schema ready");
  } catch (err) {
    ready = false;
    logger.warn("Postgres unavailable; investigation history will NOT persist", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function closeDb(): Promise<void> {
  await pool.end().catch(() => undefined);
}

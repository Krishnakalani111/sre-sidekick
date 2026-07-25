/**
 * Backend base URL + typed calls against the Sidekick API.
 *
 * The URL comes from VITE_API_URL, which Vite inlines at BUILD time (the app
 * ships as static files behind nginx, so there is no runtime env). The Docker
 * build passes it as a build arg; `npm run dev` reads it from .env.local.
 * Default is the backend's published port on the host.
 *
 * Cross-origin is fine — the backend enables cors() for exactly this.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

/** Join a path onto the backend base URL: apiUrl("/stt") -> "http://…:3000/stt". */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Pull the backend's JSON `error` field out of a failed response. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body?.error) return body.error;
  } catch {
    // non-JSON body — fall through to the status line
  }
  return `${res.status} ${res.statusText}`;
}

export interface HealthResponse {
  status: string;
  mcp: boolean;
  provider: string;
  stt: "configured" | "missing key";
  slack: "configured" | "missing token";
}

/** GET /health — also tells the UI whether STT is usable before offering a mic. */
export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(apiUrl("/health"));
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as HealthResponse;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  model: string;
  language: string;
}

export interface RecommendedAction {
  title: string;
  detail: string;
  risk: "low" | "medium" | "high";
  requiresApproval: boolean;
}

export interface TimelineEntry {
  /** ISO timestamp. */
  time: string;
  event: string;
}

export interface Diagnosis {
  query: string;
  status: string;
  title: string;
  rootCause: string;
  confidence: number;
  evidence: string[];
  suggestedFix: string;
  affectedServices: string[];
  recommendedActions: RecommendedAction[];
  timeline: TimelineEntry[];
  verificationStatus: string;
  /** Rendered RCA document — only present when format: "markdown" is sent. */
  markdown?: string;
}

/**
 * POST /investigate — free-text question in, RCA out. Same endpoint the Slack
 * bot uses. Fails while the SigNoz MCP server is unreachable (no data source).
 *
 * We ask for `format: "markdown"`, which ADDS a `markdown` field to the normal
 * response. The Slack bot omits the flag and gets the unchanged JSON, so the
 * two clients don't constrain each other.
 */
export async function investigate(query: string): Promise<Diagnosis> {
  const res = await fetch(apiUrl("/investigate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, format: "markdown" }),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as Diagnosis;
}

export type Accuracy = "accurate" | "inaccurate" | "unverified";

/** A persisted investigation row — see apps/backend/DASHBOARD_API.md. */
export interface InvestigationRow {
  id: string;
  createdAt: string;
  source: string;
  /** The detected issue: an alert name, or the question that was asked. */
  issue: string;
  service: string;
  severity: string;
  title: string;
  rootCause: string;
  confidence: number;
  evidence: string[];
  suggestedFix: string;
  affectedServices: string[];
  accuracy: Accuracy;
  feedbackNote: string | null;
  feedbackAt: string | null;
}

/** One planner iteration: what it decided to do next, and why. */
export interface InvestigationStep {
  step: number;
  reasoning: string;
  done: boolean;
  toolCalls: Array<{ tool: string; reason?: string }>;
  okCount?: number;
  resultCount?: number;
}

export interface InvestigationsPage {
  total: number;
  limit: number;
  offset: number;
  items: InvestigationRow[];
}

/** GET /investigations — newest first, paginated. */
export async function listInvestigations(
  params: { limit?: number; offset?: number; accuracy?: Accuracy } = {},
): Promise<InvestigationsPage> {
  const qs = new URLSearchParams();
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.offset !== undefined) qs.set("offset", String(params.offset));
  if (params.accuracy) qs.set("accuracy", params.accuracy);

  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await fetch(apiUrl(`/investigations${suffix}`));
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as InvestigationsPage;
}

/**
 * GET /investigations/:id — the full record: the list fields plus
 * recommendedActions, steps, and (while the backend still holds it in memory)
 * evidenceDetail.
 */
export async function getInvestigation(
  id: string,
): Promise<InvestigationRow & Partial<Diagnosis> & { steps?: InvestigationStep[] }> {
  const res = await fetch(apiUrl(`/investigations/${id}`));
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as InvestigationRow &
    Partial<Diagnosis> & { steps?: InvestigationStep[] };
}

/** PATCH /investigations/:id/feedback — the 👍/👎 on a row. */
export async function submitFeedback(
  id: string,
  accurate: boolean,
  note?: string,
): Promise<InvestigationRow> {
  const res = await fetch(apiUrl(`/investigations/${id}/feedback`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accurate, ...(note ? { note } : {}) }),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as InvestigationRow;
}

/**
 * POST /stt — multipart upload of a MediaRecorder blob under the "audio" field.
 * Throws on 400 (no file), 422 (no speech detected), 503 (no Deepgram key).
 */
export async function transcribeAudio(
  audio: Blob,
  filename = "recording.webm",
): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("audio", audio, filename);

  // No Content-Type header — the browser must set the multipart boundary.
  const res = await fetch(apiUrl("/stt"), { method: "POST", body: form });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as TranscriptionResult;
}

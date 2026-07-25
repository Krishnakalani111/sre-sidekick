/**
 * Incident data, backed by the backend's investigation history
 * (apps/backend/DASHBOARD_API.md). Rows are written automatically whenever an
 * investigation runs, via /webhook/alert or /investigate.
 *
 * The API's row shape and the UI's Incident type differ, so the mapping lives
 * here and the components stay unchanged.
 */
import {
  getInvestigation,
  listInvestigations,
  submitFeedback,
  type Accuracy,
  type InvestigationRow,
} from "@/lib/api";
import type { Incident, IncidentStatus, TimelineEvent } from "@/types/incident";

/** Reviewer feedback is what the UI shows as the incident's lifecycle state. */
function toIncidentStatus(accuracy: Accuracy): IncidentStatus {
  if (accuracy === "accurate") return "approved";
  if (accuracy === "inaccurate") return "dismissed";
  return "rca_ready";
}

function toVerificationStatus(accuracy: Accuracy): Incident["verificationStatus"] {
  if (accuracy === "accurate") return "approved";
  if (accuracy === "inaccurate") return "dismissed";
  return "pending_approval";
}

function toIncident(
  row: InvestigationRow,
  timeline: TimelineEvent[] = [],
): Incident {
  return {
    id: row.id,
    query: row.issue,
    status: "completed",
    incidentStatus: toIncidentStatus(row.accuracy),
    service: row.service || row.affectedServices?.[0] || "unknown",
    rootCause: row.rootCause,
    confidence: row.confidence,
    evidence: row.evidence ?? [],
    suggestedFix: row.suggestedFix,
    // The list endpoint omits the timeline; the detail endpoint carries it.
    timeline,
    verificationStatus: toVerificationStatus(row.accuracy),
    createdAt: row.createdAt,
    title: row.title || row.issue,
    severity: row.severity || "unknown",
    accuracy: row.accuracy,
    affectedServices: row.affectedServices ?? [],
  };
}

export async function getIncidents(): Promise<Incident[]> {
  const page = await listInvestigations({ limit: 50 });
  return page.items.map((row) => toIncident(row));
}

export async function getIncident(id: string): Promise<Incident | undefined> {
  const row = await getInvestigation(id);
  return toIncident(row, row.timeline ?? []);
}

/** Record whether the RCA was right. Returns the updated incident. */
export async function setIncidentAccuracy(
  id: string,
  accurate: boolean,
  note?: string,
): Promise<Incident> {
  return toIncident(await submitFeedback(id, accurate, note));
}

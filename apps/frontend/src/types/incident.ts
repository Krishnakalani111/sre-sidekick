export type IncidentStatus =
  | "alert_fired"
  | "investigating"
  | "rca_ready"
  | "approved"
  | "dismissed";

export interface TimelineEvent {
  time: string;
  event: string;
}

// Mirrors the response shape of ai-sre-slack-bot/src/mockBackend.js so both
// interfaces can point at the same real /investigate endpoint later.
import type { InvestigationStep } from "@/lib/api";

export type Accuracy = "accurate" | "inaccurate" | "unverified";

export interface Incident {
  id: string;
  query: string;
  status: "completed" | "in_progress";
  incidentStatus: IncidentStatus;
  service: string;
  rootCause: string;
  confidence: number;
  evidence: string[];
  suggestedFix: string;
  timeline: TimelineEvent[];
  verificationStatus: "pending_approval" | "approved" | "dismissed" | "verified";
  createdAt: string;
  /** Diagnosis headline — what the list rows show. */
  title: string;
  severity: string;
  /** Reviewer verdict on the RCA; drives the accuracy stat. */
  accuracy: Accuracy;
  affectedServices: string[];
  /** Planner trail — only the detail endpoint returns it, so it's optional. */
  steps?: InvestigationStep[];
}

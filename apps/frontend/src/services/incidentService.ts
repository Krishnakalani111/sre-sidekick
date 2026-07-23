import { mockIncidents } from "@/data/mockIncidents";
import type { Incident } from "@/types/incident";

// Stand-in for the real Sidekick server's future /incidents (list) and
// /investigate/:id (detail) endpoints. Swapping to real fetch calls later is
// a find-and-replace inside these two functions only — callers don't change.

export async function getIncidents(): Promise<Incident[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockIncidents;
}

export async function getIncident(id: string): Promise<Incident | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockIncidents.find((incident) => incident.id === id);
}

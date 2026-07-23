/**
 * In-memory investigation store, keyed by investigation id (== alert id).
 * Adequate for the current synchronous pipeline; swap for a DB later.
 */
import type { InvestigationResult } from "./orchestrator";

const store = new Map<string, InvestigationResult>();

export const investigationStore = {
  save(id: string, result: InvestigationResult): void {
    store.set(id, result);
  },
  get(id: string): InvestigationResult | undefined {
    return store.get(id);
  },
  has(id: string): boolean {
    return store.has(id);
  },
  list(): InvestigationResult[] {
    return [...store.values()];
  },
};

export default investigationStore;

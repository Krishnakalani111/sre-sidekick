import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { IncidentList } from "@/components/dashboard/IncidentList";
import { IncidentDetail } from "@/components/dashboard/IncidentDetail";
import { IncidentStats } from "@/components/dashboard/IncidentStats";
import {
  EMPTY_FILTERS,
  IncidentFilters,
  applyFilters,
  type Filters,
} from "@/components/dashboard/IncidentFilters";
import { AppShell } from "@/components/layout/AppShell";
import { useIncident, useIncidents } from "@/hooks/useIncidents";
import { setIncidentAccuracy } from "@/services/incidentService";
import type { Incident } from "@/types/incident";

export function DashboardPage() {
  const { incidents, loading, error, patchIncident } = useIncidents();
  const [selected, setSelected] = useState<Incident | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const visible = useMemo(() => applyFilters(incidents, filters), [incidents, filters]);

  // The list response has no step trail; GET /investigations/:id does. Fetch it
  // when a row opens so the sheet can show the planner's reasoning.
  const { incident: detail, loading: detailLoading } = useIncident(selected?.id);

  const row = selected ? incidents.find((i) => i.id === selected.id) ?? selected : null;
  const selectedWithDetail = row
    ? { ...row, steps: detail?.id === row.id ? detail.steps : undefined }
    : null;

  function handleDecide(id: string, decision: "approved" | "dismissed") {
    const accurate = decision === "approved";
    const before = incidents.find((i) => i.id === id);

    // Optimistic. Patch `accuracy` too, not just incidentStatus — the list row
    // badge and the summary tiles are both driven by accuracy, so updating the
    // status alone leaves them stale even though the write succeeded.
    patchIncident(id, {
      incidentStatus: decision,
      accuracy: accurate ? "accurate" : "inaccurate",
      verificationStatus: accurate ? "approved" : "dismissed",
    });

    void setIncidentAccuracy(id, accurate)
      .then((updated) => patchIncident(id, updated)) // fold in the server's record
      .catch(() => {
        // Roll back so the UI never claims a decision the backend didn't store.
        if (before) patchIncident(id, before);
      });
  }

  if (error) {
    return (
      <AppShell title="Incidents" subtitle="Live investigations from your telemetry pipeline.">
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Couldn't load investigations — {error}
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Incidents" subtitle="Live investigations from your telemetry pipeline.">
      <div className="space-y-6">
        <IncidentFilters
          incidents={incidents}
          filters={filters}
          onChange={setFilters}
          shown={visible.length}
        />

        {!loading && incidents.length > 0 && visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            No investigations match these filters.
          </p>
        ) : (
          <IncidentList incidents={visible} loading={loading} onSelect={setSelected} />
        )}

        {!loading && incidents.length > 0 && <IncidentStats incidents={incidents} />}
      </div>

      <Link
        to="/ask"
        className="fixed right-6 bottom-6 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-mono-label text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <Bot className="size-4" />
        Ask Sidekick
      </Link>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        {selectedWithDetail && (
          <IncidentDetail
            incident={selectedWithDetail}
            onDecide={handleDecide}
            stepsLoading={detailLoading}
          />
        )}
      </Sheet>
    </AppShell>
  );
}

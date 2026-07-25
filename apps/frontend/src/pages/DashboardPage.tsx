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
import { useIncidents } from "@/hooks/useIncidents";
import { setIncidentAccuracy } from "@/services/incidentService";
import type { Incident, IncidentStatus } from "@/types/incident";

export function DashboardPage() {
  const { incidents: fetchedIncidents, loading, error } = useIncidents();
  const [overrides, setOverrides] = useState<Record<string, IncidentStatus>>({});
  const [selected, setSelected] = useState<Incident | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const incidents = fetchedIncidents.map((incident) =>
    overrides[incident.id] ? { ...incident, incidentStatus: overrides[incident.id] } : incident
  );

  const visible = useMemo(() => applyFilters(incidents, filters), [incidents, filters]);

  const selectedWithOverride = selected
    ? incidents.find((i) => i.id === selected.id) ?? selected
    : null;

  function handleDecide(id: string, decision: "approved" | "dismissed") {
    // Optimistic — the row flips immediately, then persists as RCA feedback.
    setOverrides((prev) => ({ ...prev, [id]: decision }));
    void setIncidentAccuracy(id, decision === "approved").catch(() => {
      // Roll back so the UI doesn't claim a decision the backend never stored.
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
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
        {selectedWithOverride && (
          <IncidentDetail incident={selectedWithOverride} onDecide={handleDecide} />
        )}
      </Sheet>
    </AppShell>
  );
}

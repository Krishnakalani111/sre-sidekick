import { useState } from "react";
import { Link } from "react-router-dom";
import { Sheet } from "@/components/ui/sheet";
import { IncidentList } from "@/components/dashboard/IncidentList";
import { IncidentDetail } from "@/components/dashboard/IncidentDetail";
import { useIncidents } from "@/hooks/useIncidents";
import type { Incident, IncidentStatus } from "@/types/incident";

export function DashboardPage() {
  const { incidents: fetchedIncidents, loading } = useIncidents();
  const [overrides, setOverrides] = useState<Record<string, IncidentStatus>>({});
  const [selected, setSelected] = useState<Incident | null>(null);

  const incidents = fetchedIncidents.map((incident) =>
    overrides[incident.id] ? { ...incident, incidentStatus: overrides[incident.id] } : incident
  );

  const selectedWithOverride = selected
    ? incidents.find((i) => i.id === selected.id) ?? selected
    : null;

  function handleDecide(id: string, decision: "approved" | "dismissed") {
    setOverrides((prev) => ({ ...prev, [id]: decision }));
  }

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              S
            </span>
            <span className="font-display text-lg">Sidekick</span>
          </Link>
          <span className="font-mono-label text-muted-foreground">Incident Dashboard</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display text-3xl">Incidents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live investigations from your telemetry pipeline.
        </p>

        <div className="mt-8">
          <IncidentList incidents={incidents} loading={loading} onSelect={setSelected} />
        </div>
      </main>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        {selectedWithOverride && (
          <IncidentDetail incident={selectedWithOverride} onDecide={handleDecide} />
        )}
      </Sheet>
    </div>
  );
}

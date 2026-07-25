import { Skeleton } from "@/components/ui/skeleton";
import { IncidentListItem } from "@/components/dashboard/IncidentListItem";
import type { Incident } from "@/types/incident";

export function IncidentList({
  incidents,
  loading,
  onSelect,
}: {
  incidents: Incident[];
  loading: boolean;
  onSelect: (incident: Incident) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => (
        <IncidentListItem
          key={incident.id}
          incident={incident}
          onClick={() => onSelect(incident)}
        />
      ))}
    </div>
  );
}

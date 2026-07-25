import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfidenceMeter } from "@/components/dashboard/ConfidenceMeter";
import type { Incident } from "@/types/incident";

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
}

export function IncidentListItem({
  incident,
  onClick,
}: {
  incident: Incident;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer gap-3 border-border p-4 transition-colors hover:border-primary/50 hover:bg-muted/40"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <StatusBadge status={incident.incidentStatus} />
            <span className="font-mono-label text-muted-foreground">{incident.service}</span>
          </div>
          <p className="truncate text-sm font-medium text-foreground">{incident.rootCause}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <ConfidenceMeter confidence={incident.confidence} size="sm" />
          <span className="font-mono-label text-muted-foreground">
            {relativeTime(incident.createdAt)}
          </span>
        </div>
      </div>
    </Card>
  );
}

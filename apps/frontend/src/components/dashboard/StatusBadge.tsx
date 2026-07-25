import { cn } from "@/lib/utils";
import type { IncidentStatus } from "@/types/incident";

const STATUS_CONFIG: Record<IncidentStatus, { label: string; className: string }> = {
  alert_fired: {
    label: "Alert Fired",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
  investigating: {
    label: "Investigating",
    className: "bg-daylight-blue/15 text-[#4d6fc4] border-daylight-blue/30 animate-pulse",
  },
  rca_ready: {
    label: "RCA Ready",
    className: "bg-daylight-yellow/20 text-[#a8790a] dark:text-daylight-yellow border-daylight-yellow/40",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  dismissed: {
    label: "Dismissed",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "font-mono-label inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        config.className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

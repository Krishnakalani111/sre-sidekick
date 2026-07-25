/**
 * Incident row, after the Stitch "All Incidents Dashboard" screen: severity
 * marker, title + id, metadata line, and a confidence bar on the right.
 *
 * Every value comes from the investigation record — the design's `INC-9482`
 * style id isn't something the backend mints, so the row shows a short prefix
 * of the real UUID rather than a made-up ticket number.
 */
import { AlertTriangle, CheckCircle2, Clock, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Accuracy, Incident } from "@/types/incident";

function relativeTime(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Alert severities vary by source, so match loosely and fall back to neutral. */
function severityStyle(severity: string) {
  const s = severity.toLowerCase();
  if (s.startsWith("crit") || s === "error" || s === "fatal")
    return { label: "CRIT", color: "text-status-critical", dot: "bg-status-critical" };
  if (s.startsWith("warn"))
    return { label: "WARN", color: "text-status-warning", dot: "bg-status-warning" };
  if (s === "info")
    return { label: "INFO", color: "text-muted-foreground", dot: "bg-muted-foreground" };
  return {
    label: severity.slice(0, 4).toUpperCase(),
    color: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };
}

const accuracyStyle: Record<Accuracy, { color: string; Icon: typeof CheckCircle2 }> = {
  accurate: { color: "text-status-success", Icon: CheckCircle2 },
  inaccurate: { color: "text-status-critical", Icon: AlertTriangle },
  unverified: { color: "text-muted-foreground", Icon: Clock },
};

/** Confidence is colour-coded on the same scale as severity. */
function confidenceTone(confidence: number) {
  if (confidence >= 0.8) return { text: "text-status-success", bar: "bg-status-success" };
  if (confidence >= 0.5) return { text: "text-status-warning", bar: "bg-status-warning" };
  return { text: "text-status-critical", bar: "bg-status-critical" };
}

export function IncidentListItem({
  incident,
  onClick,
}: {
  incident: Incident;
  onClick: () => void;
}) {
  const severity = severityStyle(incident.severity);
  const { color: accuracyColor, Icon: AccuracyIcon } = accuracyStyle[incident.accuracy];
  const tone = confidenceTone(incident.confidence);
  const pct = Math.round(incident.confidence * 100);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className="group flex cursor-pointer items-center gap-6 rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/40"
    >
      <div className="flex shrink-0 flex-col items-center">
        <span className={cn("mb-1 size-2 rounded-full", severity.dot)} />
        <span className={cn("font-mono-label", severity.color)}>{severity.label}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-3">
          <h3 className="truncate font-medium transition-colors group-hover:text-primary">
            {incident.title}
          </h3>
          <span className="shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {incident.id.slice(0, 8)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono-label text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {relativeTime(incident.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Server className="size-3" />
            {incident.affectedServices.length > 0
              ? incident.affectedServices.join(", ")
              : incident.service}
          </span>
          <span className={cn("flex items-center gap-1", accuracyColor)}>
            <AccuracyIcon className="size-3" />
            {incident.accuracy}
          </span>
        </div>
      </div>

      <div className="hidden w-48 shrink-0 flex-col gap-1 sm:flex">
        <div className="mb-0.5 flex items-end justify-between">
          <span className="font-mono-label text-muted-foreground">Confidence</span>
          <span className={cn("font-mono text-[10px]", tone.text)}>{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

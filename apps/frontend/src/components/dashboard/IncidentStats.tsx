/**
 * Summary tiles for the incident list.
 *
 * Every figure is derived from the loaded investigation records. The Stitch
 * design also shows "Mean time to resolve" and "Active agents"; neither is
 * built here because nothing in the backend records a resolution time or an
 * agent fleet, and a hardcoded MTTR is indistinguishable from a measured one.
 */
import { Gauge, Target, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Incident } from "@/types/incident";

function Tile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  sub: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-center gap-2 font-mono-label text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className={cn("mt-3 font-display text-3xl", tone ?? "text-foreground")}>{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

export function IncidentStats({ incidents }: { incidents: Incident[] }) {
  const total = incidents.length;
  const reviewed = incidents.filter((i) => i.accuracy !== "unverified");
  const accurate = incidents.filter((i) => i.accuracy === "accurate").length;
  const pending = total - reviewed.length;

  // Undefined until someone has actually rated an RCA — show a dash, not 0%.
  const accuracyPct =
    reviewed.length > 0 ? Math.round((accurate / reviewed.length) * 100) : null;

  const avgConfidence =
    total > 0
      ? Math.round((incidents.reduce((sum, i) => sum + i.confidence, 0) / total) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Tile
        icon={Target}
        label="RCA accuracy"
        value={accuracyPct === null ? "—" : `${accuracyPct}%`}
        sub={
          reviewed.length > 0
            ? `${accurate} of ${reviewed.length} reviewed marked accurate`
            : "No RCAs reviewed yet"
        }
        tone="text-primary"
      />
      <Tile
        icon={Gauge}
        label="Avg confidence"
        value={`${avgConfidence}%`}
        sub={`Across ${total} investigation${total === 1 ? "" : "s"}`}
      />
      <Tile
        icon={Clock3}
        label="Pending review"
        value={String(pending)}
        sub={pending > 0 ? "Awaiting an accuracy verdict" : "Everything reviewed"}
      />
    </div>
  );
}

import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfidenceMeter } from "@/components/dashboard/ConfidenceMeter";
import { EvidenceList } from "@/components/dashboard/EvidenceList";
import { Timeline } from "@/components/dashboard/Timeline";
import { ApproveDismissActions } from "@/components/dashboard/ApproveDismissActions";
import type { Incident, IncidentStatus } from "@/types/incident";

export function IncidentDetail({
  incident,
  onDecide,
}: {
  incident: Incident;
  onDecide: (id: string, decision: "approved" | "dismissed") => void;
}) {
  const handleDecide = (decision: "approved" | "dismissed") => onDecide(incident.id, decision);
  const displayStatus: IncidentStatus = incident.incidentStatus;

  return (
    <SheetContent side="right" className="w-full gap-0 sm:max-w-lg">
      <SheetHeader className="gap-2 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={displayStatus} />
          <span className="font-mono-label text-muted-foreground">{incident.service}</span>
        </div>
        <SheetTitle className="font-display text-xl">{incident.rootCause}</SheetTitle>
        <SheetDescription className="italic">&ldquo;{incident.query}&rdquo;</SheetDescription>
      </SheetHeader>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-6 py-4">
          <section>
            <h3 className="font-mono-label mb-2 text-muted-foreground">Confidence</h3>
            <ConfidenceMeter confidence={incident.confidence} />
          </section>

          <Separator />

          <section>
            <h3 className="font-mono-label mb-2 text-muted-foreground">Evidence</h3>
            <EvidenceList evidence={incident.evidence} />
          </section>

          <Separator />

          <section className="gradient-panel-warm gradient-noise relative rounded-lg p-4">
            <h3 className="font-mono-label mb-1 text-white/80">Suggested Fix</h3>
            <p className="text-sm font-medium text-white">{incident.suggestedFix}</p>
          </section>

          <Separator />

          <section>
            <h3 className="font-mono-label mb-3 text-muted-foreground">Timeline</h3>
            <Timeline timeline={incident.timeline} />
          </section>

          <Separator />

          <section>
            <h3 className="font-mono-label mb-3 text-muted-foreground">Actions</h3>
            <ApproveDismissActions status={displayStatus} onDecide={handleDecide} />
          </section>
        </div>
      </ScrollArea>
    </SheetContent>
  );
}

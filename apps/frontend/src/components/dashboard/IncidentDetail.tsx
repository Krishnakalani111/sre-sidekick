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
import { InvestigationSteps } from "@/components/dashboard/InvestigationSteps";
import type { Incident, IncidentStatus } from "@/types/incident";

export function IncidentDetail({
  incident,
  onDecide,
  stepsLoading = false,
}: {
  incident: Incident;
  onDecide: (id: string, decision: "approved" | "dismissed") => void;
  /** The step trail arrives from a second request, after the row is shown. */
  stepsLoading?: boolean;
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

      {/* min-h-0 is load-bearing: a flex child defaults to min-height:auto, so
          without it this grows to fit its content and the sheet never scrolls. */}
      <ScrollArea className="min-h-0 flex-1 px-4">
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

          {/* The history API doesn't persist a timeline, so this is empty for
              stored rows — render nothing rather than a bare heading. */}
          {incident.timeline.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="font-mono-label mb-3 text-muted-foreground">Timeline</h3>
                <Timeline timeline={incident.timeline} />
              </section>
            </>
          )}

          <Separator />

          {/* Above the step trail — the trail can run long, and the decision
              shouldn't be the thing you have to scroll past it to reach. */}
          <section>
            <h3 className="font-mono-label mb-3 text-muted-foreground">Actions</h3>
            <ApproveDismissActions status={displayStatus} onDecide={handleDecide} />
          </section>

          <Separator />

          <section>
            <h3 className="font-mono-label mb-1 text-muted-foreground">How Sidekick got here</h3>
            <p className="mb-3 text-xs text-muted-foreground/70">
              The planner's reasoning and the MCP tools it called at each step.
            </p>
            <InvestigationSteps steps={incident.steps} loading={stepsLoading} />
          </section>
        </div>
      </ScrollArea>
    </SheetContent>
  );
}

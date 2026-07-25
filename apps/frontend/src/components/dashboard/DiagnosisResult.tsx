/**
 * RCA result layout, after the Stitch mockup: investigation header with a
 * confidence readout, root cause, risk-badged action cards, then a right rail
 * of evidence / affected services / timeline.
 *
 * Driven by the STRUCTURED response fields, not the `markdown` one — the layout
 * places confidence, each action's risk, and each timeline entry independently,
 * which a single prose blob can't express.
 */
import { useState } from "react";
import {
  Activity,
  BarChart3,
  Box,
  Check,
  CircleCheck,
  Loader2,
  ScrollText,
  Waypoints,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Diagnosis, RecommendedAction } from "@/lib/api";

const riskStyles: Record<RecommendedAction["risk"], string> = {
  low: "bg-status-success/15 text-status-success",
  medium: "bg-status-warning/15 text-status-warning",
  high: "bg-status-critical/15 text-status-critical",
};

/** Pick an icon from the evidence line's "traces: …" / "logs: …" prefix. */
function evidenceIcon(line: string) {
  const kind = line.split(":")[0]?.toLowerCase() ?? "";
  if (kind.includes("trace")) return Waypoints;
  if (kind.includes("log")) return ScrollText;
  if (kind.includes("metric")) return BarChart3;
  return Box;
}

/** Split "traces: error spans with exceptions" into a label and its detail. */
function splitEvidence(line: string): { label: string; detail: string } {
  const idx = line.indexOf(":");
  if (idx === -1) return { label: line, detail: "" };
  return { label: line.slice(0, idx), detail: line.slice(idx + 1).trim() };
}

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card p-6", className)}>
      {children}
    </div>
  );
}

function ActionCard({ action }: { action: RecommendedAction }) {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");

  return (
    <div className="group rounded-xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/50">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className={cn(
            "rounded px-2 py-0.5 font-mono-label",
            riskStyles[action.risk] ?? riskStyles.medium,
          )}
        >
          {action.risk} risk
        </span>
        <Zap className="size-4 text-muted-foreground group-hover:text-primary" />
      </div>

      <h5 className="font-medium">{action.title}</h5>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">{action.detail}</p>

      <Button
        variant={state === "done" ? "secondary" : "outline"}
        size="lg"
        className="w-full"
        disabled={state !== "idle"}
        onClick={() => {
          // Local acknowledgement only — no remediation endpoint exists yet.
          setState("running");
          setTimeout(() => setState("done"), 900);
        }}
      >
        {state === "running" && <Loader2 className="animate-spin" />}
        {state === "done" && <Check />}
        {state === "idle" ? "Approve" : state === "running" ? "Running…" : "Acknowledged"}
      </Button>
    </div>
  );
}

export function DiagnosisResult({ diagnosis }: { diagnosis: Diagnosis }) {
  const confidence = Math.round(diagnosis.confidence * 100);
  const evidence = diagnosis.evidence ?? [];
  const actions = diagnosis.recommendedActions ?? [];
  const timeline = diagnosis.timeline ?? [];

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <Panel>
          <div className="flex justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded bg-status-success/15 px-2 py-0.5 font-mono-label text-status-success">
                <span className="size-1.5 rounded-full bg-status-success" />
                {diagnosis.status}
              </span>
              <h3 className="font-display text-2xl leading-tight">{diagnosis.title}</h3>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display text-3xl text-primary">{confidence}%</div>
              <div className="font-mono-label text-muted-foreground">Confidence</div>
            </div>
          </div>

          <div className="mt-6 border-t border-border/60 pt-6">
            <h4 className="font-mono-label text-muted-foreground">Root cause</h4>
            <p className="mt-2 rounded border border-border/60 border-l-4 border-l-primary bg-muted/30 p-4 text-sm leading-relaxed">
              {diagnosis.rootCause}
            </p>
          </div>

          {diagnosis.suggestedFix && (
            <div className="mt-4">
              <h4 className="font-mono-label text-muted-foreground">Suggested fix</h4>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {diagnosis.suggestedFix}
              </p>
            </div>
          )}
        </Panel>

        {actions.length > 0 && (
          <div className="space-y-4">
            <h3 className="px-1 font-mono-label text-muted-foreground">Recommended actions</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {actions.map((action, i) => (
                <ActionCard key={i} action={action} />
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-6 lg:col-span-4">
        {evidence.length > 0 && (
          <Panel>
            <h4 className="mb-4 flex items-center gap-2 font-mono-label text-muted-foreground">
              <Box className="size-3.5" />
              Evidence
            </h4>
            <ul className="space-y-3">
              {evidence.map((line, i) => {
                const Icon = evidenceIcon(line);
                const { label, detail } = splitEvidence(line);
                return (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded border border-border/40 bg-muted/20 p-2"
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      {detail && (
                        <p className="font-mono text-xs break-words text-muted-foreground">
                          {detail}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}

        {diagnosis.affectedServices?.length > 0 && (
          <Panel>
            <h4 className="mb-4 font-mono-label text-muted-foreground">Affected services</h4>
            <div className="flex flex-wrap gap-2">
              {diagnosis.affectedServices.map((service) => (
                <span
                  key={service}
                  className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 font-mono text-xs"
                >
                  <span className="size-1 rounded-full bg-primary" />
                  {service}
                </span>
              ))}
            </div>
          </Panel>
        )}

        {timeline.length > 0 && (
          <Panel>
            <h4 className="mb-6 font-mono-label text-muted-foreground">Investigation timeline</h4>
            <ol className="relative space-y-6 border-l border-border/60 pl-6">
              {timeline.map((entry, i) => {
                const first = i === 0;
                const last = i === timeline.length - 1;
                return (
                  <li key={i} className="relative">
                    <span
                      className={cn(
                        "absolute top-1 -left-[30px] size-3.5 rounded-full border-4 border-card",
                        first
                          ? "bg-status-critical"
                          : last
                            ? "bg-status-success"
                            : "bg-primary",
                      )}
                    />
                    <p className="font-mono text-xs text-primary">
                      {new Date(entry.time).toLocaleTimeString()}
                    </p>
                    <p className="mt-0.5 text-sm">{entry.event}</p>
                  </li>
                );
              })}
            </ol>
          </Panel>
        )}
      </aside>
    </div>
  );
}

/** Empty state shown before the first question is sent. */
export function DiagnosisPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 p-12 text-center">
      <Activity className="size-6 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">
        No investigation yet — ask a question above.
      </p>
      <p className="flex items-center gap-1.5 font-mono-label text-muted-foreground/60">
        <CircleCheck className="size-3" />
        Sidekick queries traces, logs and metrics before answering
      </p>
    </div>
  );
}

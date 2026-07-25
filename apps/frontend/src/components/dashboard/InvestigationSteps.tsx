/**
 * The planner's trail — one entry per iteration, showing what it decided to do
 * next and which MCP tools it called to do it.
 *
 * This is the "show your work" panel: an RCA is only trustworthy if you can see
 * which evidence it was built from. Only GET /investigations/:id returns
 * `steps`, so it's absent on rows loaded from the list.
 */
import { Check, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InvestigationStep } from "@/lib/api";

export function InvestigationSteps({
  steps,
  loading,
}: {
  steps: InvestigationStep[] | undefined;
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading investigation steps…</p>;
  }
  if (!steps || steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No step trail recorded for this investigation.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {steps.map((step) => (
        <li key={step.step} className="relative border-l border-border/60 pl-5">
          <span
            className={cn(
              "absolute top-1 -left-[7px] flex size-3.5 items-center justify-center rounded-full border-4 border-background",
              step.done ? "bg-status-success" : "bg-primary",
            )}
          />

          <div className="flex items-center gap-2">
            <span className="font-mono-label text-primary">Step {step.step}</span>
            {step.done && (
              <span className="flex items-center gap-1 font-mono-label text-status-success">
                <Check className="size-3" />
                concluded
              </span>
            )}
            {typeof step.okCount === "number" && typeof step.resultCount === "number" && (
              <span className="font-mono-label text-muted-foreground/60">
                {step.okCount}/{step.resultCount} ok
              </span>
            )}
          </div>

          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.reasoning}</p>

          {step.toolCalls?.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {step.toolCalls.map((call, i) => (
                <li
                  key={`${call.tool}-${i}`}
                  className="rounded border border-border/40 bg-muted/20 p-2"
                >
                  <span className="flex items-center gap-1.5 font-mono text-xs text-foreground">
                    <Wrench className="size-3 shrink-0 text-primary" />
                    {call.tool}
                  </span>
                  {call.reason && (
                    <p className="mt-1 text-xs text-muted-foreground">{call.reason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

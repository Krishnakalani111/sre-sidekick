import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const STEPS = [
  "OpenTelemetry",
  "SigNoz",
  "Alert",
  "Webhook",
  "AI Sidekick",
  "MCP Evidence",
  "RCA",
  "Slack / Voice / UI",
  "Human Approval",
  "Safe Action",
  "Verify",
  "Incident Report",
];

export function FlowDiagram() {
  return (
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <p className="font-mono-label mb-3 text-primary">[ 01 — The Pipeline ]</p>
          <h2 className="font-display max-w-2xl text-4xl font-medium text-balance md:text-5xl">
            Observe, investigate, act — end to end.
          </h2>
        </Reveal>

        <Reveal className="mt-12 flex flex-wrap items-center gap-2" stagger={0.03} y={12}>
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="font-mono-label rounded-full border border-border bg-background px-3 py-2 whitespace-nowrap">
                {step}
              </span>
              {i < STEPS.length - 1 && (
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
              )}
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

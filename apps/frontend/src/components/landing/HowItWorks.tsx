import { Reveal } from "@/components/Reveal";
import { BellRing, ScanSearch, ShieldCheck } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: BellRing,
    title: "Alert fires",
    description:
      "SigNoz detects an anomaly against your SLOs and pushes a webhook to Sidekick — no polling, no delay.",
  },
  {
    n: "02",
    icon: ScanSearch,
    title: "AI investigates",
    description:
      "Sidekick pulls traces, metrics, and logs via MCP, correlates evidence, and generates a root cause with a confidence score.",
  },
  {
    n: "03",
    icon: ShieldCheck,
    title: "Human approves & verifies",
    description:
      "You approve the fix from Slack, voice, or the dashboard. Sidekick executes it and verifies recovery automatically.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative">
      <div className="mx-auto max-w-6xl px-6 pt-24 pb-14">
        <Reveal>
          <p className="font-mono-label mb-3 text-primary">[ 02 — How It Works ]</p>
          <h2 className="font-display max-w-2xl text-4xl font-medium text-balance md:text-5xl">
            A new way to handle incidents.
          </h2>
        </Reveal>
      </div>

      {/* Sticky-stack: each step pins at the top of the viewport for the height
          of its wrapper, then the next step's opaque panel scrolls up to cover
          it — same technique godaylight.com uses for its "How it works" steps,
          achieved with plain CSS `position: sticky`, no scroll-jacking JS. */}
      <ul className="relative">
        {STEPS.map((step, i) => (
          <li key={step.n} className="sticky top-0 h-[100svh]" style={{ zIndex: i + 1 }}>
            <article className="flex h-full w-full flex-col items-center justify-center border-t border-border bg-background px-6">
              <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
                <span className="font-mono-label rounded-full border border-border px-3 py-1 text-muted-foreground">
                  Step {step.n}
                </span>
                <step.icon className="size-10 text-primary" strokeWidth={1.5} />
                <h3 className="font-display text-4xl md:text-6xl">{step.title}</h3>
                <p className="max-w-lg text-muted-foreground md:text-lg">{step.description}</p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

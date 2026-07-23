import { Reveal } from "@/components/Reveal";

const SIGNALS = [
  { label: "Latency", description: "How long requests take, watched at the p50/p95/p99." },
  { label: "Traffic", description: "Demand on your system, so anomalies are relative, not absolute." },
  { label: "Errors", description: "Rate of failed requests, correlated across services." },
  { label: "Saturation", description: "How full your system is — CPU, memory, connections, queues." },
];

export function GoldenSignals() {
  return (
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <p className="font-mono-label mb-3 text-primary">[ 03 — Golden Signals ]</p>
          <h2 className="font-display max-w-2xl text-4xl font-medium text-balance md:text-5xl">
            Sidekick watches what matters.
          </h2>
        </Reveal>

        <Reveal
          className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4"
          stagger={0.1}
          y={20}
        >
          {SIGNALS.map((signal) => (
            <div key={signal.label} className="bg-background p-6">
              <p className="font-mono-label text-primary">{signal.label}</p>
              <p className="mt-2 text-sm text-muted-foreground">{signal.description}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/Reveal";
import { Gauge, ShieldCheck, MessagesSquare, Sparkles } from "lucide-react";

const PILLARS = [
  { icon: Gauge, title: "Faster MTTR", description: "Root cause in minutes, not hours of dashboard-hopping." },
  { icon: ShieldCheck, title: "Human-in-the-loop safety", description: "Nothing gets fixed automatically without your approval." },
  { icon: Sparkles, title: "Explainable RCA", description: "Every conclusion comes with the evidence that led to it." },
  { icon: MessagesSquare, title: "Multi-interface", description: "Investigate from Slack, voice, or the dashboard — your choice." },
];

export function OutcomePillars() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <p className="font-mono-label mb-3 text-primary">[ 04 — Outcomes ]</p>
        <h2 className="font-display max-w-2xl text-4xl font-medium text-balance md:text-5xl">
          Observe → Detect → Investigate → Explain → Approve → Act → Verify → Report.
        </h2>
      </Reveal>

      <Reveal className="mt-14 grid gap-4 md:grid-cols-2" stagger={0.1} y={24}>
        {PILLARS.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="flex-row items-start gap-4 border-border p-6">
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.75} />
            <div>
              <h3 className="font-display text-lg">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          </Card>
        ))}
      </Reveal>
    </section>
  );
}

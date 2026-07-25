import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/Reveal";
import { AlertTriangle, Clock, BrainCircuit } from "lucide-react";

const PROBLEMS = [
  {
    icon: AlertTriangle,
    title: "Alert fatigue",
    description: "Dozens of alerts fire before anyone can tell which one actually matters.",
  },
  {
    icon: Clock,
    title: "Manual RCA takes hours",
    description: "Engineers dig through dashboards, traces, and logs by hand while the clock runs.",
  },
  {
    icon: BrainCircuit,
    title: "Fixes require tribal knowledge",
    description: "The right remediation often lives in one person's head, not in a runbook.",
  },
];

export function ProblemSection() {
  return (
    <section id="why" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <p className="font-mono-label mb-3 text-primary">[ 00 — The Problem ]</p>
        <h2 className="font-display max-w-2xl text-4xl font-medium text-balance md:text-5xl">
          Incident response is still mostly manual.
        </h2>
      </Reveal>

      <Reveal className="mt-14 grid gap-4 md:grid-cols-3" stagger={0.12} y={24}>
        {PROBLEMS.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="gap-3 border-border p-6">
            <Icon className="size-5 text-primary" strokeWidth={1.75} />
            <h3 className="font-display text-xl">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </Card>
        ))}
      </Reveal>
    </section>
  );
}

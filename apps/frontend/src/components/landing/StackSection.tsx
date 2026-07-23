import { Reveal } from "@/components/Reveal";

const STACK = [
  "OpenTelemetry",
  "SigNoz",
  "MCP",
  "Slack",
  "n8n",
  "Node.js",
  "Gemini 2.5 Flash",
  "Groq Whisper",
];

export function StackSection() {
  return (
    <section id="stack" className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <Reveal>
          <p className="font-mono-label mb-3 text-primary">[ 05 — Works With Your Stack ]</p>
          <h2 className="font-display mx-auto max-w-2xl text-4xl font-medium text-balance md:text-5xl">
            Every service you instrument makes Sidekick smarter.
          </h2>
        </Reveal>

        <Reveal
          className="mt-12 flex flex-wrap items-center justify-center gap-3"
          stagger={0.05}
          y={16}
        >
          {STACK.map((tool) => (
            <span
              key={tool}
              className="font-mono-label rounded-full border border-border bg-background px-4 py-2"
            >
              {tool}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

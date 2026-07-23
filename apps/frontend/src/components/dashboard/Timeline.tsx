import type { TimelineEvent } from "@/types/incident";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function Timeline({ timeline }: { timeline: TimelineEvent[] }) {
  return (
    <ol className="space-y-4">
      {timeline.map((step, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
            {i < timeline.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
          </div>
          <div className="pb-4">
            <p className="font-mono-label text-muted-foreground">{formatTime(step.time)}</p>
            <p className="text-sm text-foreground/90">{step.event}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

import { cn } from "@/lib/utils";

function confidenceClasses(confidence: number) {
  if (confidence >= 0.8) return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" };
  if (confidence >= 0.5) return { text: "text-[#a8790a] dark:text-daylight-yellow", bar: "bg-daylight-yellow" };
  return { text: "text-destructive", bar: "bg-destructive" };
}

export function ConfidenceMeter({
  confidence,
  size = "default",
}: {
  confidence: number;
  size?: "default" | "sm";
}) {
  const pct = Math.round(confidence * 100);
  const { text, bar } = confidenceClasses(confidence);

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "overflow-hidden rounded-full bg-muted",
          size === "sm" ? "h-1 w-16" : "h-1.5 w-24"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("font-mono-label", text)}>{pct}%</span>
    </div>
  );
}

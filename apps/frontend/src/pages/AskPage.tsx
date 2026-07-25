/**
 * Ask Sidekick — the prompt workspace. Type or dictate a question, send it to
 * POST /investigate, and read the RCA it comes back with.
 *
 * Separate route from the incident list so the two aren't competing for the
 * same page: this one is a single task from start to finish.
 */
import { AskSidekick } from "@/components/dashboard/AskSidekick";
import { AppShell } from "@/components/layout/AppShell";

export function AskPage() {
  return (
    <AppShell
      title="Ask Sidekick"
      subtitle="Describe the symptoms — Sidekick investigates your telemetry and reports back."
    >
      <AskSidekick />
    </AppShell>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { IncidentStatus } from "@/types/incident";

export function ApproveDismissActions({
  status,
  onDecide,
}: {
  status: IncidentStatus;
  onDecide: (decision: "approved" | "dismissed") => void;
}) {
  const [message, setMessage] = useState<string | null>(null);

  if (status === "approved" || status === "dismissed") {
    return (
      <p className="font-mono-label text-muted-foreground">
        {status === "approved" ? "Fix approved — remediation executed and verified." : "Dismissed."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          onClick={() => {
            onDecide("approved");
            setMessage("Fix approved. Executing remediation and verifying recovery...");
          }}
        >
          Approve Fix
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            onDecide("dismissed");
            setMessage("Dismissed.");
          }}
        >
          Dismiss
        </Button>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

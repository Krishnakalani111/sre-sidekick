import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            S
          </span>
          <span className="font-display text-lg">Sidekick</span>
        </div>
        <p className="font-mono-label text-muted-foreground">
          AI SRE Sidekick — built on SigNoz
        </p>
        <Link to="/dashboard" className="font-mono-label text-primary hover:underline">
          View Dashboard →
        </Link>
      </div>
    </footer>
  );
}

export function EvidenceList({ evidence }: { evidence: string[] }) {
  return (
    <ul className="space-y-2">
      {evidence.map((line) => (
        <li
          key={line}
          className="rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-xs leading-relaxed text-foreground/80"
        >
          {line}
        </li>
      ))}
    </ul>
  );
}

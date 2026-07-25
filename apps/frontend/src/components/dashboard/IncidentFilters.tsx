/**
 * Filter chips for the incident list — severity, service, and review accuracy.
 *
 * Options are derived from the loaded rows rather than a fixed list, so the
 * dropdowns can only offer values that actually exist in the data. Filtering
 * is client-side: GET /investigations paginates and filters on `accuracy`
 * only, and the page already holds the full result set.
 */
import { Filter, Hexagon, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Incident } from "@/types/incident";

export interface Filters {
  severity: string;
  service: string;
  accuracy: string;
}

export const EMPTY_FILTERS: Filters = { severity: "all", service: "all", accuracy: "all" };

export function applyFilters(incidents: Incident[], filters: Filters): Incident[] {
  return incidents.filter((incident) => {
    if (filters.severity !== "all" && incident.severity !== filters.severity) return false;
    if (filters.accuracy !== "all" && incident.accuracy !== filters.accuracy) return false;
    if (filters.service !== "all") {
      const services = incident.affectedServices.length
        ? incident.affectedServices
        : [incident.service];
      if (!services.includes(filters.service)) return false;
    }
    return true;
  });
}

const chip =
  "flex items-center gap-2 rounded border border-border/60 bg-muted/30 px-3 py-1.5 font-mono-label transition-colors hover:border-primary/50";

function Chip({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: typeof Filter;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const active = value !== "all";
  return (
    <label className={cn(chip, active && "border-primary/60 text-primary")}>
      <Icon className="size-3.5" />
      <span>{label}:</span>
      {/* Native select — keyboard and screen-reader behaviour for free. */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer bg-transparent font-mono-label outline-none"
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function IncidentFilters({
  incidents,
  filters,
  onChange,
  shown,
}: {
  incidents: Incident[];
  filters: Filters;
  onChange: (filters: Filters) => void;
  shown: number;
}) {
  const severities = [...new Set(incidents.map((i) => i.severity))].sort();
  const services = [
    ...new Set(
      incidents.flatMap((i) => (i.affectedServices.length ? i.affectedServices : [i.service])),
    ),
  ].sort();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          icon={Filter}
          label="Severity"
          value={filters.severity}
          options={severities}
          onChange={(severity) => onChange({ ...filters, severity })}
        />
        <Chip
          icon={Hexagon}
          label="Service"
          value={filters.service}
          options={services}
          onChange={(service) => onChange({ ...filters, service })}
        />
        <Chip
          icon={ShieldCheck}
          label="Review"
          value={filters.accuracy}
          options={["accurate", "inaccurate", "unverified"]}
          onChange={(accuracy) => onChange({ ...filters, accuracy })}
        />
      </div>

      <span className="flex items-center gap-2 font-mono-label text-muted-foreground">
        Showing: {shown}
        <span className="size-1.5 animate-pulse rounded-full bg-primary" />
      </span>
    </div>
  );
}

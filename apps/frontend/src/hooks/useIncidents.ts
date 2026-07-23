import { useEffect, useState } from "react";
import { getIncident, getIncidents } from "@/services/incidentService";
import type { Incident } from "@/types/incident";

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getIncidents().then((data) => {
      if (!cancelled) {
        setIncidents(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { incidents, loading };
}

export function useIncident(id: string | undefined) {
  const [incident, setIncident] = useState<Incident | undefined>(undefined);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) {
      setIncident(undefined);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getIncident(id).then((data) => {
      if (!cancelled) {
        setIncident(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { incident, loading };
}

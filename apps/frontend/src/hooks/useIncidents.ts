import { useCallback, useEffect, useState } from "react";
import { getIncident, getIncidents } from "@/services/incidentService";
import type { Incident } from "@/types/incident";

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setIncidents(await getIncidents());
      setError(null);
    } catch (err) {
      // Now a real HTTP call — a down backend must not leave a stuck spinner.
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getIncidents()
      .then((data) => {
        if (cancelled) return;
        setIncidents(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { incidents, loading, error, reload: load };
}

export function useIncident(id: string | undefined) {
  const [incident, setIncident] = useState<Incident | undefined>(undefined);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setIncident(undefined);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getIncident(id)
      .then((data) => {
        if (cancelled) return;
        setIncident(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { incident, loading, error };
}

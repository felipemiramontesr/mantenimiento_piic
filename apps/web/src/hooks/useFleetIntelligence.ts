import { useState, useEffect } from 'react';
import api from '../api/client';

export type FleetIntelligenceData = {
  oee: number | null;
  tco_per_km: number | null;
  km_per_liter: number | null;
  pm_compliance: number | null;
  backlog_aging_days: number | null;
};

type UseFleetIntelligenceResult = {
  data: FleetIntelligenceData | null;
  loading: boolean;
  error: string | null;
};

export function useFleetIntelligence(unitId: string | null): UseFleetIntelligenceResult {
  const [data, setData] = useState<FleetIntelligenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (unitId) {
      setLoading(true);
      setError(null);
      api
        .get<{ success: boolean; data: FleetIntelligenceData }>(
          `/fleet-units/${unitId}/intelligence`
        )
        .then((res) => {
          if (!cancelled) setData(res.data.data);
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return (): void => {
      cancelled = true;
    };
  }, [unitId]);

  return { data, loading, error };
}

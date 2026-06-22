import { useState, useEffect } from 'react';
import api from '../api/client';

export type Co2Data = {
  fuel_code: string | null;
  co2_factor_kg_per_liter: number | null;
  total_liters: number | null;
  total_co2_kg: number | null;
  period_from: string | null;
  period_to: string | null;
};

type UseCo2Result = {
  data: Co2Data | null;
  loading: boolean;
  error: string | null;
};

export function useCo2(unitId: string | null): UseCo2Result {
  const [data, setData] = useState<Co2Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (unitId) {
      setLoading(true);
      setError(null);
      api
        .get<{ success: boolean; data: Co2Data }>(`/fleet-units/${unitId}/co2`)
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

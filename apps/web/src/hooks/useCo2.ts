import { useState, useEffect } from 'react';
import { getCo2 } from '../api/co2';

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
      getCo2(unitId)
        .then((result) => {
          if (!cancelled) setData(result);
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

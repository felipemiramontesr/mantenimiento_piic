import { useState, useEffect } from 'react';
import api from '../api/client';

export type EconomicLifeData = {
  residual_value_mxn: number | null;
  accumulated_tco: number | null;
  replacement_score: number | null;
  recommendation: 'KEEP' | 'EVALUATE' | 'REPLACE' | null;
};

type UseEconomicLifeResult = {
  data: EconomicLifeData | null;
  loading: boolean;
  error: string | null;
};

export function useEconomicLife(unitId: string | null): UseEconomicLifeResult {
  const [data, setData] = useState<EconomicLifeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (unitId) {
      setLoading(true);
      setError(null);
      api
        .get<{ success: boolean; data: EconomicLifeData }>(`/fleet-units/${unitId}/economic-life`)
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

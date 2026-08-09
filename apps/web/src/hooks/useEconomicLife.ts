import { useState, useEffect } from 'react';
import { getEconomicLife } from '../api/economicLife';

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
      getEconomicLife(unitId)
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

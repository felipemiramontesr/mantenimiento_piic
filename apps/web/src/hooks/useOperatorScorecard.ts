import { useState, useEffect } from 'react';
import api from '../api/client';

export type OperatorScorecardData = {
  driver_id: number | null;
  route_count: number | null;
  fuel_efficiency_score: number | null;
  incident_rate_score: number | null;
  checkpoint_adherence_score: number | null;
  composite_score: number | null;
};

type UseOperatorScorecardResult = {
  data: OperatorScorecardData | null;
  loading: boolean;
  error: string | null;
};

export function useOperatorScorecard(unitId: string | null): UseOperatorScorecardResult {
  const [data, setData] = useState<OperatorScorecardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (unitId) {
      setLoading(true);
      setError(null);
      api
        .get<{ success: boolean; data: OperatorScorecardData }>(
          `/fleet-units/${unitId}/operator-score`
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

import { useState, useEffect } from 'react';
import api from '../api/client';

export type AnomalyDetectionData = {
  fleet_size: number | null;
  algorithm: string | null;
  unit_km_per_liter: number | null;
  baseline_km_per_liter: number | null;
  deviation_pct: number | null;
  z_score: number | null;
  is_anomaly: boolean | null;
};

type UseAnomalyDetectionResult = {
  data: AnomalyDetectionData | null;
  loading: boolean;
  error: string | null;
};

export function useAnomalyDetection(unitId: string | null): UseAnomalyDetectionResult {
  const [data, setData] = useState<AnomalyDetectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (unitId) {
      setLoading(true);
      setError(null);
      api
        .get<{ success: boolean; data: AnomalyDetectionData }>(`/fleet-units/${unitId}/anomalies`)
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

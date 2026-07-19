import { useState, useEffect } from 'react';
import api from '../api/client';

export type TcoData = {
  fleet_unit_id: string;
  tco_total: number;
  tco_maintenance: number;
  tco_insurance: number;
  tco_lease: number;
  tco_tenencia: number;
  tco_verificacion: number;
  tco_fuel: number;
  tco_other: number;
  total_records: number;
  last_record_at: string | null;
};

type UseTcoResult = {
  data: TcoData | null;
  loading: boolean;
  error: string | null;
};

export function useTco(unitId: string | null): UseTcoResult {
  const [data, setData] = useState<TcoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (unitId) {
      setLoading(true);
      setError(null);
      api
        .get<{ success: boolean; data: TcoData }>(`/fleet-units/${unitId}/tco`)
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

import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export type RecallStatus = 'PENDING' | 'COMPLETED' | 'NOT_APPLICABLE';

export type RecallItem = {
  recall_id: number;
  campaign_code: string;
  description: string;
  make: string;
  model: string;
  year: number;
  published_date: string;
  status: RecallStatus;
  resolved_at: string | null;
  work_order_id: number | null;
};

type UseFleetRecallsResult = {
  recalls: RecallItem[];
  loading: boolean;
  error: string | null;
  refresh(): void;
  linkRecall(recallId: number): Promise<void>;
  updateStatus(recallId: number, status: RecallStatus): Promise<void>;
};

export function useFleetRecalls(unitId: string | null): UseFleetRecallsResult {
  const [recalls, setRecalls] = useState<RecallItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (unitId) {
      setLoading(true);
      setError(null);
      api
        .get<{ success: boolean; data: RecallItem[] }>(`/fleet-units/${unitId}/recalls`)
        .then((res) => {
          if (!cancelled) setRecalls(res.data.data);
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
  }, [unitId, tick]);

  const linkRecall = useCallback(
    async (recallId: number): Promise<void> => {
      await api.post(`/fleet-units/${unitId}/recalls`, { recallId });
      refresh();
    },
    [unitId, refresh]
  );

  const updateStatus = useCallback(
    async (recallId: number, status: RecallStatus): Promise<void> => {
      await api.patch(`/fleet-units/${unitId}/recalls/${recallId}`, { status });
      refresh();
    },
    [unitId, refresh]
  );

  return { recalls, loading, error, refresh, linkRecall, updateStatus };
}

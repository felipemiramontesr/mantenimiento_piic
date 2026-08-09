import { useState, useEffect, useCallback } from 'react';
import { getFleetRecalls, linkFleetRecall, updateFleetRecallStatus } from '../api/fleetRecalls';

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
      getFleetRecalls(unitId)
        .then((result) => {
          if (!cancelled) setRecalls(result);
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
      await linkFleetRecall(unitId as string, recallId);
      refresh();
    },
    [unitId, refresh]
  );

  const updateStatus = useCallback(
    async (recallId: number, status: RecallStatus): Promise<void> => {
      await updateFleetRecallStatus(unitId as string, recallId, status);
      refresh();
    },
    [unitId, refresh]
  );

  return { recalls, loading, error, refresh, linkRecall, updateStatus };
}

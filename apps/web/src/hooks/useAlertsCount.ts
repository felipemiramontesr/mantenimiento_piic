import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

interface UseAlertsCountOptions {
  userId?: string;
}

interface UseAlertsCountResult {
  count: number;
  isLoading: boolean;
}

const POLL_INTERVAL_MS = 60_000;

export default function useAlertsCount(_options?: UseAlertsCountOptions): UseAlertsCountResult {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get('/alerts/count');
      setCount(res.data?.count ?? 0);
    } catch {
      // fail silently — badge disappears on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const timer = setInterval(fetchCount, POLL_INTERVAL_MS);
    return (): void => clearInterval(timer);
  }, [fetchCount]);

  return { count, isLoading };
}

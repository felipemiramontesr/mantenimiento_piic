import { useState, useEffect, useCallback } from 'react';
import { getAlertsCount } from '../api/alerts';
import { useAuth } from '../context/AuthContext';

interface UseAlertsCountOptions {
  userId?: string;
}

interface UseAlertsCountResult {
  count: number;
  isLoading: boolean;
}

const POLL_INTERVAL_MS = 60_000;

/**
 * FC 094 F4 — background poller, one of the async flows ADR-007 has in mind:
 * it can genuinely outlive a login/logout (60s interval). Guarded by the
 * single `sessionEpochRef` (I10) via `useAuth().getSessionEpoch` — the same
 * capture-then-compare pattern `AuthContext`'s own mount-time refresh uses,
 * not a second, competing guard.
 */
export default function useAlertsCount(_options?: UseAlertsCountOptions): UseAlertsCountResult {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { getSessionEpoch } = useAuth();

  const fetchCount = useCallback(async (): Promise<void> => {
    const epochAtStart = getSessionEpoch();
    try {
      const freshCount = await getAlertsCount();
      if (getSessionEpoch() !== epochAtStart) return; // stale — a login/logout landed first
      setCount(freshCount);
    } catch {
      // fail silently — badge disappears on error
    } finally {
      if (getSessionEpoch() === epochAtStart) setIsLoading(false);
    }
  }, [getSessionEpoch]);

  useEffect(() => {
    fetchCount();
    const timer = setInterval(fetchCount, POLL_INTERVAL_MS);
    return (): void => clearInterval(timer);
  }, [fetchCount]);

  return { count, isLoading };
}

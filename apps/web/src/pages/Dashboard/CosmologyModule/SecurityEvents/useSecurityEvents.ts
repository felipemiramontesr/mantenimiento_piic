import { useCallback, useEffect, useState } from 'react';
import { fetchSecurityEvents, SecurityEventsData } from './securityEventsApi';

const EMPTY: SecurityEventsData = { events: [], blocks: [] };

interface SecurityEventsState {
  readonly data: SecurityEventsData;
  readonly loading: boolean;
  readonly error: boolean;
  readonly refetch: () => void;
}

/** FC201 F3 — datos de la tarjeta de eventos (la tarjeta solo se monta para Ω). */
export default function useSecurityEvents(): SecurityEventsState {
  const [data, setData] = useState<SecurityEventsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchSecurityEvents()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return (): void => {
      cancelled = true;
    };
  }, [epoch]);

  const refetch = useCallback((): void => setEpoch((e) => e + 1), []);
  return { data, loading, error, refetch };
}

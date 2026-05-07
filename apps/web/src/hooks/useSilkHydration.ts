import { useState, useEffect, useCallback, Dispatch, SetStateAction, useRef } from 'react';
import { archonCache } from '../utils/archonCache';
import api from '../api/client';

interface SilkHydrationOptions<T> {
  key: string;
  endpoint: string;
  initialData?: T[];
  onSuccess?: (data: T[]) => void;
  transform?: (data: unknown) => T[];
}

interface SilkHydrationResult<T> {
  data: T[];
  setData: Dispatch<SetStateAction<T[]>>;
  isSyncing: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * 🔱 ARCHON SILK HYDRATION HOOK
 * Architecture: Cache-First, Background-Sync (Sovereign Persistence)
 * Principle: DRY & SOLID - Centralized Data Lifecycle
 * Version: 1.0.0
 */
export default function useSilkHydration<T>({
  key,
  endpoint,
  initialData = [],
  onSuccess,
  transform,
}: SilkHydrationOptions<T>): SilkHydrationResult<T> {
  // 1. Initial State from Cache (Silk Layer)
  const [data, setData] = useState<T[]>(() => {
    const cached = archonCache.get<T[]>(key);
    return cached || initialData;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 🛡️ Mount Shield Protocol
  const isMounted = useRef(true);
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    []
  );

  // 2. Atomic Sync Engine
  const sync = useCallback(async (): Promise<void> => {
    if (!isMounted.current) return;

    setIsSyncing(true);
    setError(null);
    try {
      const response = await api.get(endpoint);
      let freshData = response.data?.data || response.data || [];

      if (transform) {
        freshData = transform(freshData);
      }

      if (isMounted.current) {
        setData(freshData);
        archonCache.set(key, freshData);
        if (onSuccess) onSuccess(freshData);
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Sync failed'));
      }
    } finally {
      if (isMounted.current) {
        setIsSyncing(false);
      }
    }
  }, [key, endpoint, transform, onSuccess]);

  // 3. Auto-Hydration on Mount
  useEffect(() => {
    sync();
  }, [sync]);

  return {
    data,
    setData,
    isSyncing,
    error,
    refresh: sync,
  };
}

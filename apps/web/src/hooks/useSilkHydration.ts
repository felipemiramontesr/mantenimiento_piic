import { useState, useEffect, useCallback, Dispatch, SetStateAction, useRef } from 'react';
import { archonCache } from '../utils/archonCache';
import api from '../api/client';
import { SYSTEM_VERSION } from '../constants/versionConstants';

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

  // 🔱 Silent Sync State: Only true if we have zero data and are fetching
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 🔱 Archon Bridge: Global State Exposure (Forensic Access)
  useEffect(() => {
    (window as any).__ARCHON_FLEET__ = {
      data,
      isSyncing,
      lastUpdate: new Date().toISOString(),
      metadata: {
        version: SYSTEM_VERSION,
        engine: 'Silk Hydration v.2.0.0'
      }
    };
  }, [data, isSyncing]);

  // 🛡️ Mount Shield Protocol
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 2. Atomic Sync Engine (Sovereign Revalidation)
  const sync = useCallback(async (isSilent = false): Promise<void> => {
    if (!isMounted.current || isSyncing) return;

    // 🛡️ FAILSAFE TIMEOUT: Force IDLE state after 15s
    const failsafe = setTimeout(() => {
      if (isMounted.current && isSyncing) {
        console.warn(`⚠️ [Archon Silk] Failsafe for ${key}.`);
        setIsSyncing(false);
      }
    }, 15000);

    // DETERMINISTIC LOADING: Only show if cache is empty AND not a silent sync
    // We use a functional check to avoid closure staleness without adding data to deps
    let shouldShowLoading = false;
    setData(prev => {
      if (!isSilent && prev.length === 0) {
        shouldShowLoading = true;
      }
      return prev;
    });
    
    if (shouldShowLoading) {
      setIsSyncing(true);
    }
    
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
        const is429 = (err as any)?.response?.status === 429;
        setError(err instanceof Error ? err : new Error(is429 ? 'RATE_LIMIT_EXCEEDED' : 'Sync failed'));
      }
    } finally {
      if (failsafe) clearTimeout(failsafe);
      if (isMounted.current) {
        setIsSyncing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, endpoint, transform, onSuccess]); // data.length removed to break the loop

  // 3. Auto-Hydration on Mount (Stale-While-Revalidate)
  useEffect(() => {
    const hasCache = !!archonCache.get(key);
    sync(hasCache); // If we have cache, sync silently in background
  }, [sync, key]);

  return {
    data,
    setData,
    isSyncing,
    error,
    refresh: () => sync(false), // Refresh button always shows loading
  };
}

import {
  useState,
  useEffect,
  useCallback,
  Dispatch,
  SetStateAction,
  useRef,
  MutableRefObject,
} from 'react';
import { archonCache } from '../utils/archonCache';
import api from '../api/client';
import { SYSTEM_VERSION } from '../constants/versionConstants';

interface SilkHydrationOptions<T> {
  key: string;
  endpoint: string | null;
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

/** 🔱 Archon Bridge: Global State Exposure (Forensic Access) — extraída de
 * `useSilkHydration` para respetar el cap de 50 líneas de Gate 2 (FC166
 * Track D); mismo comportamiento verbatim. */
function useSilkGlobalBridge<T>(data: T[], isSyncing: boolean): void {
  useEffect(() => {
    // Exposing an arbitrary debug property on `window` is inherently
    // untyped (no lib type declares it). `__ARCHON_FLEET__` is a
    // deliberate "special global" naming convention (same pattern as
    // `__REDUX_DEVTOOLS_EXTENSION__`), not a private-member access, so
    // the underscore rule is disabled specifically for this one line.
    // eslint-disable-next-line no-underscore-dangle
    (window as unknown as Record<string, unknown>).__ARCHON_FLEET__ = {
      data,
      isSyncing,
      lastUpdate: new Date().toISOString(),
      metadata: {
        version: SYSTEM_VERSION,
        engine: 'Silk Hydration v.2.0.0',
      },
    };
  }, [data, isSyncing]);
}

/** 🛡️ Mount Shield Protocol — extraída del mismo motivo (Gate 2); mismo
 * comportamiento verbatim. */
function useMountedRef(): MutableRefObject<boolean> {
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return (): void => {
      isMounted.current = false;
    };
  }, []);
  return isMounted;
}

interface SilkSyncContext<T> {
  key: string;
  endpoint: string | null;
  isMounted: MutableRefObject<boolean>;
  isSyncingRef: MutableRefObject<boolean>;
  transformRef: MutableRefObject<((data: unknown) => T[]) | undefined>;
  onSuccessRef: MutableRefObject<((data: T[]) => void) | undefined>;
  setData: Dispatch<SetStateAction<T[]>>;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<Error | null>>;
}

/** 🛡️ FAILSAFE TIMEOUT: fuerza IDLE tras 15s si el sync sigue "colgado" —
 * extraída de `runSilkSync` por el mismo motivo (Gate 2); mismo
 * comportamiento verbatim. */
function armSilkFailsafe(
  key: string,
  isMounted: MutableRefObject<boolean>,
  isSyncingRef: MutableRefObject<boolean>,
  setIsSyncing: Dispatch<SetStateAction<boolean>>
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    if (isMounted.current && isSyncingRef.current) {
      // eslint-disable-next-line no-console -- diagnóstico de failsafe intencional
      console.warn(`⚠️ [Archon Silk] Failsafe for ${key}.`);
      // Mutar `.current` de un MutableRefObject recibido como parámetro es
      // el patrón idiomático de React para refs (no una mutación de dato
      // real); mismo patrón que `isMounted.current = false` en
      // `useMountedRef` (ahí `isMounted` es variable local, no parámetro,
      // por eso no dispara la regla ahí).
      // eslint-disable-next-line no-param-reassign
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, 15000);
}

/** DETERMINISTIC LOADING: solo activa el flag de loading si el cache está
 * vacío Y no es un sync silencioso — extraída del mismo motivo (Gate 2);
 * mismo comportamiento verbatim (checa vía functional-update para evitar
 * closure staleness sin añadir `data` a deps). */
function resolveSilkShouldShowLoading<T>(
  isSilent: boolean,
  setData: Dispatch<SetStateAction<T[]>>
): boolean {
  let shouldShowLoading = false;
  setData((prev) => {
    if (!isSilent && prev.length === 0) {
      shouldShowLoading = true;
    }
    return prev;
  });
  return shouldShowLoading;
}

/** Ejecuta el fetch + transform + persistencia del sync — extraída del mismo
 * motivo (Gate 2); mismo comportamiento verbatim (try/catch/finally con
 * mount-shield y clasificación 429). */
async function executeSilkFetch<T>(
  ctx: SilkSyncContext<T>,
  failsafe: ReturnType<typeof setTimeout>
): Promise<void> {
  const {
    key,
    endpoint,
    isMounted,
    isSyncingRef,
    transformRef,
    onSuccessRef,
    setData,
    setIsSyncing,
    setError,
  } = ctx;
  try {
    // `endpoint` ya fue validado no-null por el guard de `runSilkSync`.
    const response = await api.get(endpoint as string);
    let freshData = response.data?.data || response.data || [];

    if (transformRef.current) {
      freshData = transformRef.current(freshData);
    }

    if (isMounted.current) {
      setData(freshData);
      archonCache.set(key, freshData);
      if (onSuccessRef.current) onSuccessRef.current(freshData);
    }
  } catch (err: unknown) {
    if (isMounted.current) {
      const status = (err as { response?: { status?: number } } | undefined)?.response?.status;
      const is429 = status === 429;
      setError(
        err instanceof Error ? err : new Error(is429 ? 'RATE_LIMIT_EXCEEDED' : 'Sync failed')
      );
    }
  } finally {
    // setTimeout nunca retorna un valor falsy -- el guard `if(failsafe)`
    // era, por contrato de la API, inalcanzable (FC165 F3 Slice3.2
    // Batch2, purga sintáctica).
    clearTimeout(failsafe);
    if (isMounted.current) {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }
}

/** 2. Atomic Sync Engine (Sovereign Revalidation) — extraída del cuerpo del
 * `useCallback` de `sync` por el mismo motivo (Gate 2); mismo comportamiento
 * verbatim (failsafe 15s, loading determinístico, mount-shield). */
async function runSilkSync<T>(ctx: SilkSyncContext<T>, isSilent: boolean): Promise<void> {
  const { key, endpoint, isMounted, isSyncingRef, setData, setIsSyncing, setError } = ctx;
  if (!endpoint || !isMounted.current || isSyncingRef.current) return;

  const failsafe = armSilkFailsafe(key, isMounted, isSyncingRef, setIsSyncing);

  if (resolveSilkShouldShowLoading(isSilent, setData)) {
    isSyncingRef.current = true;
    setIsSyncing(true);
  }

  setError(null);
  await executeSilkFetch(ctx, failsafe);
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

  useSilkGlobalBridge(data, isSyncing);
  const isMounted = useMountedRef();

  // 🔱 Stable Callback References: Prevent unstable inline function closures from triggering recursive renders
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  // Ref mirror for isSyncing: closures inside useCallback capture stale state values,
  // so guards and the failsafe must read the current value via a ref instead.
  const isSyncingRef = useRef(false);

  const sync = useCallback(
    (isSilent = false): Promise<void> =>
      runSilkSync(
        {
          key,
          endpoint,
          isMounted,
          isSyncingRef,
          transformRef,
          onSuccessRef,
          setData,
          setIsSyncing,
          setError,
        },
        isSilent
      ),
    [key, endpoint, isMounted]
  ); // transform and onSuccess removed to break the loop

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

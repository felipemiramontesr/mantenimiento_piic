import { useState, useEffect, useMemo } from 'react';
import api from '../../../api/client';
import { archonCache } from '../../../utils/archonCache';
import { ActivityLog } from './types';
import filterAndSortLogs from './journalLogFilters';

export interface ForensicLogsState {
  logs: ActivityLog[];
  loading: boolean;
  sessionEvidence: Map<string, { maxObserved: number }>;
}

/** FASE 1: Inteligencia de Sesión (Doble Pase Forense) — escanea todos los
 * logs antes de renderizar para construir el mapa de evidencia física
 * (capacidad de tanque observada por unidad). */
function buildSessionEvidence(logs: ActivityLog[]): Map<string, { maxObserved: number }> {
  const evidenceMap = new Map<string, { maxObserved: number }>();
  logs.forEach((l) => {
    const normId = String(l.unit_id || '')
      .replace(/^(ASM-|UN-|0+)/gi, '')
      .trim()
      .toLowerCase();
    if (!normId) return;
    const current = evidenceMap.get(normId) || { maxObserved: 0 };
    // Si un log marca 100%, esa es nuestra capacidad observada "techo"
    if (l.fuel_level_after !== null && Number(l.fuel_level_after) === 100) {
      current.maxObserved = Math.max(current.maxObserved, Number(l.fuel_after));
    }
    evidenceMap.set(normId, current);
  });
  return evidenceMap;
}

async function fetchCachedLogs(
  routeUuid: string | undefined,
  unitId: string | undefined
): Promise<ActivityLog[] | null> {
  const cached = archonCache.get<ActivityLog[]>('forensic_journal_logs');
  if (!cached) return null;
  return filterAndSortLogs(cached, routeUuid, unitId);
}

async function fetchFreshLogs(
  routeUuid: string | undefined,
  unitId: string | undefined
): Promise<ActivityLog[]> {
  const res = await api.get('/unit-logs');
  const freshData = res.data?.data || [];
  archonCache.set('forensic_journal_logs', freshData);
  return filterAndSortLogs(freshData, routeUuid, unitId);
}

/** Reemplaza `prev` solo si el conjunto de ids realmente cambió — evita un
 * flash de DOM innecesario cuando el fetch fresco confirma los mismos logs. */
function mergeIfChanged(prev: ActivityLog[], next: ActivityLog[]): ActivityLog[] {
  const prevIds = prev.map((l) => l.id).join(',');
  const nextIds = next.map((l) => l.id).join(',');
  if (prevIds === nextIds && prev.length === next.length) return prev;
  return next;
}

/** Estado + carga (cache-first + sync silenciosa) del Journal Forense —
 * extraído de `ForensicJournalTable` para mantenerlo bajo el presupuesto de
 * Gate2 (FC165 F3 Slice3.1 Batch4, Dual-Gate Isolation). */
export default function useForensicLogs(
  unitId: string | undefined,
  routeUuid: string | undefined
): ForensicLogsState {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async (): Promise<void> => {
      // 🧠 Silk Hydration Phase 1: Cache-First
      const cachedLogs = await fetchCachedLogs(routeUuid, unitId);
      if (cachedLogs) {
        setLogs(cachedLogs);
        setLoading(false);
      }
      // 🧠 Silk Hydration Phase 2: Silent Sync
      try {
        const freshLogs = await fetchFreshLogs(routeUuid, unitId);
        setLogs((prev) => mergeIfChanged(prev, freshLogs));
      } catch {
        // Sovereign silence
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [unitId, routeUuid]);

  const sessionEvidence = useMemo(() => buildSessionEvidence(logs), [logs]);

  return { logs, loading, sessionEvidence };
}

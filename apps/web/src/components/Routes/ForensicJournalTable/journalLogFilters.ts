import { ActivityLog } from './types';

/** Filtra por `routeUuid`/`unitId` y ordena por fecha descendente — la misma
 * regla se aplicaba dos veces (cache-first y fetch fresco) en el componente
 * original; extraída a una función pura compartida (FC165 F3 Slice3.1
 * Batch4, Dual-Gate Isolation). */
export default function filterAndSortLogs(
  data: ActivityLog[],
  routeUuid: string | undefined,
  unitId: string | undefined
): ActivityLog[] {
  let filtered = data;
  if (routeUuid) {
    filtered = filtered.filter((l: ActivityLog) => l.reference_id === routeUuid);
    filtered = filtered.filter(
      (l: ActivityLog) => l.event_type !== 'ROUTE_START' && l.event_type !== 'ROUTE_FINISH'
    );
  } else if (unitId) {
    filtered = filtered.filter((l: ActivityLog) => l.unit_id === unitId);
  }
  return [...filtered].sort(
    (a: ActivityLog, b: ActivityLog) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

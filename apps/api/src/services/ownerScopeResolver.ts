import FleetService from './fleetService';

/**
 * FC 138 F1 (Cond.R-138-H1) — SSOT of the T2 owner-scope resolution
 * (prescribed by FC126 Cond.R-126-S1/`127_AN`, previously duplicated between
 * `fleetRoutes.ts`'s pre-migration `resolveOwnerScope` and `finance.ts`'s own
 * copy — the latter never remediated because FC126 excluded `finance.ts` from
 * its scope). `routeService.ts` (H3) and `finance.service.ts` (H2) both
 * delegate here exclusively — zero other local copy of this logic permitted.
 */
export interface ScopedUser {
  id: number;
  permissions?: string[];
  tenant_id?: number | null;
}

/** T2 (127_AN): Ω→`null` · `fleet:scoped`→owner ids · tenant-only→`[tenantId]` · neither→`[]` (DENY). */
export async function resolveOwnerScope(user: ScopedUser): Promise<number[] | null> {
  const { id, permissions, tenant_id: tenantId } = user;
  if (permissions?.includes('*')) return null;
  if (permissions?.includes('fleet:scoped')) {
    return FleetService.getUserOwnerIds(id);
  }
  if (tenantId == null) return [];
  return [tenantId];
}

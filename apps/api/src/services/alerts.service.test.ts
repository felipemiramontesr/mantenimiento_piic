/**
 * FC 094 F3 — Tests del tenant scoping de AlertsService (Cond.R-F3-T7, BOLA
 * negativo). `resolveTenantScope`/`resolveMaintenanceScope` son la única
 * puerta entre un actor y el filtro de tenant que ve el Repository — se
 * prueban aislados, sin HTTP ni SQL real (esos ya los cubre
 * `alertsIntegration.test.ts`).
 */
import { describe, expect, it, vi } from 'vitest';

import { DENY, resolveMaintenanceScope, resolveTenantScope } from './alerts.service';

vi.mock('./fleetService', () => ({
  default: { getUserOwnerIds: vi.fn() },
}));

// eslint-disable-next-line import/first -- mock must be declared before import
import FleetService from './fleetService';

describe('resolveTenantScope — T1/T2 (BOLA negativo)', () => {
  it('Ω (permissions ["*"]) siempre recibe tenantId: null — acceso global legítimo', () => {
    expect(resolveTenantScope({ userId: 1, permissions: ['*'], tenantId: null })).toEqual({
      tenantId: null,
    });
    // Incluso si por error llevara un tenantId, Ω sigue siendo global (T2).
    expect(resolveTenantScope({ userId: 1, permissions: ['*'], tenantId: 42 })).toEqual({
      tenantId: null,
    });
  });

  it('un actor no-Ω con tenantId resuelto queda filtrado a SU tenant', () => {
    expect(resolveTenantScope({ userId: 2, permissions: ['fleet:view'], tenantId: 900 })).toEqual({
      tenantId: 900,
    });
  });

  it('BOLA: un actor no-Ω SIN tenantId (null) es DENEGADO, nunca tratado como global', () => {
    expect(resolveTenantScope({ userId: 2, permissions: ['fleet:view'], tenantId: null })).toBe(
      DENY
    );
  });

  it('BOLA: dos actores con tenantId distinto reciben scopes distintos (aislamiento)', () => {
    const tenantA = resolveTenantScope({ userId: 2, permissions: ['fleet:view'], tenantId: 100 });
    const tenantB = resolveTenantScope({ userId: 3, permissions: ['fleet:view'], tenantId: 200 });
    expect(tenantA).toEqual({ tenantId: 100 });
    expect(tenantB).toEqual({ tenantId: 200 });
    expect(tenantA).not.toEqual(tenantB);
  });
});

describe('resolveMaintenanceScope — T5 (preserva el mecanismo multi-owner existente)', () => {
  it('Ω recibe tenantId: null sin consultar getUserOwnerIds', async () => {
    const result = await resolveMaintenanceScope({ userId: 1, permissions: ['*'], tenantId: null });
    expect(result).toEqual({ tenantId: null });
    expect(FleetService.getUserOwnerIds).not.toHaveBeenCalled();
  });

  it('fleet:scoped con owners asignados recibe la lista completa (no solo tenantId)', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([711, 712]);
    const result = await resolveMaintenanceScope({
      userId: 42,
      permissions: ['fleet:scoped'],
      tenantId: 900,
    });
    expect(result).toEqual({ tenantId: 900, ownerIds: [711, 712] });
  });

  it('fleet:scoped sin owners asignados es DENEGADO (deny-by-default preservado)', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);
    const result = await resolveMaintenanceScope({
      userId: 42,
      permissions: ['fleet:scoped'],
      tenantId: 900,
    });
    expect(result).toBe(DENY);
  });

  it('actor no-Ω, no-scoped, sin tenantId es DENEGADO (mismo T2 que el caso general)', async () => {
    const result = await resolveMaintenanceScope({
      userId: 2,
      permissions: ['maint:view'],
      tenantId: null,
    });
    expect(result).toBe(DENY);
  });
});

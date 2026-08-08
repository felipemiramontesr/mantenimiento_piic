import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import FleetService from './fleetService';
import { resolveOwnerScope } from './ownerScopeResolver';

vi.mock('./fleetService', () => ({
  default: {
    getUserOwnerIds: vi.fn(),
  },
}));

/**
 * FC 138 F1 (Cond.R-138-B2) — BOLA regression suite for the T2 SSOT.
 * Prior to this FC, `finance.ts`'s local copy of this logic fell through to
 * `ownerScope = null` (unrestricted) for a non-Ω, non-`fleet:scoped` actor —
 * the exact class of bug this suite exists to pin down permanently.
 */
describe('ownerScopeResolver — resolveOwnerScope (T2)', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it('Ω (permissions includes "*") → null (unrestricted, global access)', async () => {
    const scope = await resolveOwnerScope({ id: 1, permissions: ['*'], tenant_id: null });
    expect(scope).toBeNull();
    expect(FleetService.getUserOwnerIds).not.toHaveBeenCalled();
  });

  it('fleet:scoped carrier → delegates to FleetService.getUserOwnerIds', async () => {
    (FleetService.getUserOwnerIds as Mock).mockResolvedValueOnce([42, 43]);
    const scope = await resolveOwnerScope({
      id: 7,
      permissions: ['fleet:scoped'],
      tenant_id: 5,
    });
    expect(scope).toEqual([42, 43]);
    expect(FleetService.getUserOwnerIds).toHaveBeenCalledWith(7);
  });

  it('fleet:scoped carrier with no linked owners → [] (DENY, not null)', async () => {
    (FleetService.getUserOwnerIds as Mock).mockResolvedValueOnce([]);
    const scope = await resolveOwnerScope({ id: 8, permissions: ['fleet:scoped'] });
    expect(scope).toEqual([]);
  });

  it('BOLA regression: non-Ω, non-scoped actor WITH tenant_id → [tenant_id], never null', async () => {
    const scope = await resolveOwnerScope({ id: 9, permissions: [], tenant_id: 12 });
    expect(scope).toEqual([12]);
    expect(scope).not.toBeNull();
    expect(FleetService.getUserOwnerIds).not.toHaveBeenCalled();
  });

  it('non-Ω, non-scoped actor WITHOUT tenant_id → [] (DENY)', async () => {
    const scope = await resolveOwnerScope({ id: 10, permissions: [], tenant_id: null });
    expect(scope).toEqual([]);
  });

  it('non-Ω, non-scoped actor with tenant_id undefined (JWT never set it) → [] (DENY)', async () => {
    const scope = await resolveOwnerScope({ id: 11, permissions: [] });
    expect(scope).toEqual([]);
  });

  it('undefined permissions array (falsy) with tenant_id → [tenant_id], never null', async () => {
    const scope = await resolveOwnerScope({ id: 12, tenant_id: 99 });
    expect(scope).toEqual([99]);
  });
});

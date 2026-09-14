/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'mysql2/promise';
import {
  tenantExists,
  findTenantById,
  findSuperclusterByCode,
  findClusterByCode,
  findUniverseSupercluster,
  activateSupercluster,
  suspendSupercluster,
  suspendClustersUnderSupercluster,
  isSuperclusterActiveForTenant,
  activateCluster,
  suspendCluster,
  listSuperclustersForTenant,
  listClustersForTenant,
  findUniverseTypeByCode,
  findOwnerTypeByCode,
  mintUniverseTenantId,
  insertTenant,
  seedSuperclusterBlueprint,
  seedClusterBlueprint,
  countZeroStateBuckets,
  destroyUniverseRow,
  listUniverses,
  findMuCosmonautRoleId,
  usernameExists,
  insertSeedUser,
  insertTenantUserMembership,
  insertCosmonautRoleAssignment,
} from './cosmology.repository';

/**
 * FC162 F1-T5 — cosmology.repository.ts had no dedicated repository-level
 * test (only indirect exercise via cosmology.service.ts/cosmology.test.ts
 * with a module-mocked `db`). Same direct-executor pattern as
 * routeRoutes.repository.test.ts (FC162 F1-T4) — no `vi.mock('./db')`.
 */

const mockExecutor = { execute: vi.fn() } as unknown as Pool;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('tenant lookups', () => {
  it('tenantExists returns true when a row exists', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ id: 5 }], []]);
    expect(await tenantExists(5, mockExecutor)).toBe(true);
  });

  it('tenantExists returns false when no row exists', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await tenantExists(999, mockExecutor)).toBe(false);
  });

  it('findTenantById returns the row when it exists', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ id: 5, label: 'FMS Base' }], []]);
    expect(await findTenantById(5, mockExecutor)).toEqual({ id: 5, label: 'FMS Base' });
  });

  it('findTenantById returns null when no row exists', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findTenantById(999, mockExecutor)).toBeNull();
  });
});

describe('catalog lookups', () => {
  it('findSuperclusterByCode returns the row when the code is valid', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([
      [{ id: 1, code: 'FINANZAS', name: 'Finanzas' }],
      [],
    ]);
    expect(await findSuperclusterByCode('FINANZAS', mockExecutor)).toEqual({
      id: 1,
      code: 'FINANZAS',
      name: 'Finanzas',
    });
  });

  it('findSuperclusterByCode returns null when the code is invalid', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findSuperclusterByCode('NOPE', mockExecutor)).toBeNull();
  });

  it('findClusterByCode returns the row (with parent supercluster_id) when valid', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([
      [{ id: 1, supercluster_id: 1, code: 'GASTOS_EGRESOS', name: 'Egresos' }],
      [],
    ]);
    const row = await findClusterByCode('GASTOS_EGRESOS', mockExecutor);
    expect(row?.supercluster_id).toBe(1);
  });

  it('findClusterByCode returns null when the code is invalid', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findClusterByCode('NOPE', mockExecutor)).toBeNull();
  });

  it('findUniverseTypeByCode returns the row when valid', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([
      [{ id: 1, code: 'FMS', name: 'Fleet Management System' }],
      [],
    ]);
    expect((await findUniverseTypeByCode('FMS', mockExecutor))?.code).toBe('FMS');
  });

  it('findUniverseTypeByCode returns null when invalid', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findUniverseTypeByCode('NOPE', mockExecutor)).toBeNull();
  });

  it('findOwnerTypeByCode returns the row when valid', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([
      [{ id: 1, code: 'FLOTILLA', name: 'Flotilla' }],
      [],
    ]);
    expect((await findOwnerTypeByCode('FLOTILLA', mockExecutor))?.code).toBe('FLOTILLA');
  });

  it('findOwnerTypeByCode returns null when invalid', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findOwnerTypeByCode('NOPE', mockExecutor)).toBeNull();
  });
});

describe('Supercúmulo/Cúmulo mutability (Fase 1)', () => {
  it('findUniverseSupercluster returns the mutability row when it exists', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ state: 'ACTIVE' }], []]);
    expect(await findUniverseSupercluster(1, 1, mockExecutor)).toEqual({ state: 'ACTIVE' });
  });

  it('findUniverseSupercluster returns null when never added', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findUniverseSupercluster(1, 999, mockExecutor)).toBeNull();
  });

  it('activateSupercluster issues the idempotent UPSERT with the right params', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await activateSupercluster(1, 2, 20, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining('ON DUPLICATE KEY'),
      [1, 2, 20]
    );
  });

  it('suspendSupercluster issues the state=SUSPENDED UPDATE scoped to ACTIVE rows', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await suspendSupercluster(1, 2, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining("state = 'ACTIVE'"),
      [1, 2]
    );
  });

  it('suspendClustersUnderSupercluster cascades the suspend to child clusters', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 3 }, []]);
    await suspendClustersUnderSupercluster(1, 2, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining('universe_clusters'),
      [1, 2]
    );
  });

  it('isSuperclusterActiveForTenant returns true when the row state is ACTIVE', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ state: 'ACTIVE' }], []]);
    expect(await isSuperclusterActiveForTenant(1, 1, mockExecutor)).toBe(true);
  });

  it('isSuperclusterActiveForTenant returns false when SUSPENDED', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ state: 'SUSPENDED' }], []]);
    expect(await isSuperclusterActiveForTenant(1, 1, mockExecutor)).toBe(false);
  });

  it('isSuperclusterActiveForTenant returns false when never added', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await isSuperclusterActiveForTenant(1, 999, mockExecutor)).toBe(false);
  });

  it('activateCluster issues the idempotent UPSERT with the right params', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await activateCluster(1, 5, 20, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining('ON DUPLICATE KEY'),
      [1, 5, 20]
    );
  });

  it('suspendCluster issues a single-row UPDATE, no cascade', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await suspendCluster(1, 5, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(expect.any(String), [1, 5]);
  });

  it('listSuperclustersForTenant returns the LEFT JOINed catalog list', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([
      [{ code: 'FINANZAS', name: 'Finanzas', state: 'ACTIVE' }],
      [],
    ]);
    expect(await listSuperclustersForTenant(1, mockExecutor)).toHaveLength(1);
  });

  it('listClustersForTenant queries without a supercluster filter when omitted', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    await listClustersForTenant(1, undefined, mockExecutor);
    const [sql, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(sql).not.toContain('WHERE sc.code');
    expect(params).toEqual([1]);
  });

  it('listClustersForTenant adds the supercluster filter when provided', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    await listClustersForTenant(1, 'FINANZAS', mockExecutor);
    const [sql, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(sql).toContain('WHERE sc.code = ?');
    expect(params).toEqual([1, 'FINANZAS']);
  });
});

describe('Universe_Create_And_Destroy (Fase 2)', () => {
  it('mintUniverseTenantId returns the insertId from common_catalogs', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ insertId: 42 }, []]);
    expect(await mintUniverseTenantId('NEW_UNIVERSE', 'Nuevo Universo', mockExecutor)).toBe(42);
  });

  it('insertTenant issues the INSERT with the minted id and given fields', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await insertTenant(42, 'Nuevo Universo', 1, 1, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tenants'),
      [42, 'Nuevo Universo', 1, 1]
    );
  });

  it('seedSuperclusterBlueprint seeds from the universe-type blueprint table', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 5 }, []]);
    await seedSuperclusterBlueprint(42, 1, 20, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining('universe_type_superclusters'),
      [42, 20, 1]
    );
  });

  it('seedClusterBlueprint seeds every cluster whose parent SC is ACTIVE', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await seedClusterBlueprint(42, 20, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining("state = 'ACTIVE'"),
      [20, 42]
    );
  });

  it('countZeroStateBuckets returns the first row of the 9-subquery count', async () => {
    const counts = {
      fleet_units: 0,
      memberships: 0,
      role_assignments: 0,
      custom_roles: 0,
      areas: 0,
      service_links: 0,
      lattices: 0,
      social_posts: 0,
      social_reviews: 0,
    };
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[counts], []]);
    expect(await countZeroStateBuckets(42, mockExecutor)).toEqual(counts);
    const [sql, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    // FC160 F2-I4-P1 regression guard — 11 placeholders, 11 params.
    expect((sql.match(/\?/g) ?? []).length).toBe(params.length);
    expect(params).toEqual(Array(11).fill(42));
  });

  it('destroyUniverseRow deletes the tenant row and its scoped common_catalogs entry', async () => {
    vi.mocked(mockExecutor.execute)
      .mockResolvedValueOnce([{ affectedRows: 1 }, []])
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await destroyUniverseRow(42, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
    expect(mockExecutor.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('DELETE FROM tenants'),
      [42]
    );
    expect(mockExecutor.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("category = 'UNIVERSE_TENANT'"),
      [42]
    );
  });

  it('listUniverses returns the census of all tenants with active SC/Cúmulo counts', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([
      [
        {
          id: 1,
          label: 'FMS Base',
          universeTypeCode: 'FMS',
          activeSuperclusters: 5,
          activeClusters: 1,
        },
      ],
      [],
    ]);
    const rows = await listUniverses(mockExecutor);
    expect(rows).toHaveLength(1);
    expect(rows[0].universeTypeCode).toBe('FMS');
  });
});

describe('Universe_Seed_Admin_Endpoint (Fase 2b — FC176 F2)', () => {
  it('findMuCosmonautRoleId returns the R_global MU role id when migración 170 has run', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ id: 9 }], []]);
    expect(await findMuCosmonautRoleId(mockExecutor)).toBe(9);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining("tenant_id IS NULL AND name = 'MU'"),
      []
    );
  });

  it('findMuCosmonautRoleId returns null — fail-closed signal when the seed is absent', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findMuCosmonautRoleId(mockExecutor)).toBeNull();
  });

  it('usernameExists returns true when a row matches', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ id: 1 }], []]);
    expect(await usernameExists('taken@piic.mx', mockExecutor)).toBe(true);
  });

  it('usernameExists returns false when no row matches', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await usernameExists('free@piic.mx', mockExecutor)).toBe(false);
  });

  it('insertSeedUser issues the INSERT (isActive=true) and returns the new users.id', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ insertId: 77 }, []]);
    const id = await insertSeedUser(
      'mu@piic.mx',
      'MU Seed',
      'enc_mu@piic.mx',
      'argon2hash',
      true,
      mockExecutor
    );
    expect(id).toBe(77);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      ['mu@piic.mx', 'MU Seed', 'enc_mu@piic.mx', 'argon2hash', 1]
    );
  });

  it('insertSeedUser issues the INSERT with is_active=0 when isActive=false (FC177 F2 quarantine)', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ insertId: 88 }, []]);
    const id = await insertSeedUser(
      'public@piic.mx',
      'Public Signup',
      'enc_public@piic.mx',
      'argon2hash',
      false,
      mockExecutor
    );
    expect(id).toBe(88);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      ['public@piic.mx', 'Public Signup', 'enc_public@piic.mx', 'argon2hash', 0]
    );
  });

  it('insertTenantUserMembership issues the (user_id, owner_id) INSERT', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await insertTenantUserMembership(77, 900, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tenant_user_memberships'),
      [77, 900]
    );
  });

  it('insertCosmonautRoleAssignment issues the RBAC grant scoped to the Universo', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await insertCosmonautRoleAssignment(77, 9, 900, 1, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO cosmonaut_role_assignments'),
      [77, 9, 900, 1]
    );
  });
});

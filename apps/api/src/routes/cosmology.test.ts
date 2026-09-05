import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * FC160 F1 — Cosmology Core Admin Endpoints.
 * Covers: Cond.R-160-F1-R2 (Ω-only) · R3 (cascade) · R4 (precondition) · R6 (shapes).
 */

const mockConnection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([[], undefined]),
};

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));

describe('FC160 F1: /v1/cosmology/universes/:tenantId', () => {
  const app = buildApp();
  let omegaToken: string;
  let arcToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    omegaToken = jwt.sign({ id: 1, username: 'GrayMan', roleId: 0, permissions: ['*'] });
    arcToken = jwt.sign({ id: 20, username: 'arc.user', roleId: 3, permissions: ['fleet:view'] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    mockConnection.execute.mockResolvedValue([[], undefined]);
  });

  const omegaHeader = (): Record<string, string> => ({ authorization: `Bearer ${omegaToken}` });
  const arcHeader = (): Record<string, string> => ({ authorization: `Bearer ${arcToken}` });

  // ─── COSMOLOGY-OMEGA — every route is Ω-exclusive ────────────────────────

  const nonOmegaCases: Array<{ method: 'GET' | 'POST' | 'DELETE'; url: string }> = [
    { method: 'POST', url: '/v1/cosmology/universes/5/superclusters' },
    { method: 'DELETE', url: '/v1/cosmology/universes/5/superclusters/FINANZAS' },
    { method: 'GET', url: '/v1/cosmology/universes/5/superclusters' },
    { method: 'POST', url: '/v1/cosmology/universes/5/clusters' },
    { method: 'DELETE', url: '/v1/cosmology/universes/5/clusters/GASTOS_EGRESOS' },
    { method: 'GET', url: '/v1/cosmology/universes/5/clusters' },
  ];

  it.each(nonOmegaCases)(
    'COSMOLOGY-OMEGA: $method $url — 403 for non-Ω actor',
    async ({ method, url }) => {
      const res = await app.inject({
        method,
        url,
        headers: arcHeader(),
        payload: method === 'POST' ? { superclusterCode: 'FINANZAS', clusterCode: 'X' } : undefined,
      });
      expect(res.statusCode).toBe(403);
    }
  );

  it('COSMOLOGY-OMEGA-NOAUTH: no JWT — 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/cosmology/universes/5/superclusters' });
    expect(res.statusCode).toBe(401);
  });

  // ─── T1 ADD_SUPERCLUSTER ──────────────────────────────────────────────────

  it('T1: Ω activates a supercluster — 200', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // tenantExists
      .mockResolvedValueOnce([[{ id: 4, code: 'FINANZAS', name: 'Finanzas y TCO' }]]) // findSuperclusterByCode
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // activateSupercluster UPSERT
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes/5/superclusters',
      headers: omegaHeader(),
      payload: { superclusterCode: 'FINANZAS' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('T1: unknown tenant — 404 TENANT_NOT_FOUND', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]); // tenantExists → empty
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes/999/superclusters',
      headers: omegaHeader(),
      payload: { superclusterCode: 'FINANZAS' },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('TENANT_NOT_FOUND');
  });

  it('T1: unknown superclusterCode, valid tenant — 404 SUPERCLUSTER_NOT_FOUND (100% mandatorio, FC162 F3)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // tenantExists
      .mockResolvedValueOnce([[]]); // findSuperclusterByCode → not found
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes/5/superclusters',
      headers: omegaHeader(),
      payload: { superclusterCode: 'GHOST' },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('SUPERCLUSTER_NOT_FOUND');
  });

  it('T2: unknown superclusterCode, valid tenant — 404 SUPERCLUSTER_NOT_FOUND (100% mandatorio, FC162 F3)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // tenantExists
      .mockResolvedValueOnce([[]]); // findSuperclusterByCode → not found
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/5/superclusters/GHOST',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('SUPERCLUSTER_NOT_FOUND');
  });

  it('T3: unknown tenant, addCluster — 404 TENANT_NOT_FOUND (findValidCluster propio, 100% mandatorio FC162 F3)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]); // tenantExists → empty
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes/999/clusters',
      headers: omegaHeader(),
      payload: { clusterCode: 'GASTOS_EGRESOS' },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('TENANT_NOT_FOUND');
  });

  it('T3: unknown clusterCode, valid tenant — 404 CLUSTER_NOT_FOUND (100% mandatorio, FC162 F3)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // tenantExists
      .mockResolvedValueOnce([[]]); // findClusterByCode → not found
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes/5/clusters',
      headers: omegaHeader(),
      payload: { clusterCode: 'GHOST' },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('CLUSTER_NOT_FOUND');
  });

  it('T3b: unknown clusterCode, valid tenant — 404 CLUSTER_NOT_FOUND on remove (100% mandatorio, FC162 F3)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // tenantExists
      .mockResolvedValueOnce([[]]); // findClusterByCode → not found
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/5/clusters/GHOST',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('CLUSTER_NOT_FOUND');
  });

  // ─── T2 REMOVE_SUPERCLUSTER — COSMOLOGY-CASCADE-1 ────────────────────────

  it('COSMOLOGY-CASCADE-1: T2 suspends the SC and its clusters in the same transaction', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // tenantExists
      .mockResolvedValueOnce([[{ id: 4, code: 'FINANZAS', name: 'Finanzas y TCO' }]]); // findSuperclusterByCode
    mockConnection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // suspendSupercluster
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // suspendClustersUnderSupercluster
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/5/superclusters/FINANZAS',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(200);
    expect(mockConnection.beginTransaction).toHaveBeenCalled();
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(mockConnection.execute).toHaveBeenCalledTimes(2);
  });

  it('COSMOLOGY-CASCADE-ROLLBACK-1 (FC162 F1-T6): T2 rolls back if suspendClustersUnderSupercluster fails mid-TX', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // tenantExists
      .mockResolvedValueOnce([[{ id: 4, code: 'FINANZAS', name: 'Finanzas y TCO' }]]); // findSuperclusterByCode
    mockConnection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // suspendSupercluster
      .mockRejectedValueOnce(new Error('DB connection lost mid-cascade')); // suspendClustersUnderSupercluster
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/5/superclusters/FINANZAS',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(500);
    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.commit).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  // ─── T3 add cluster — COSMOLOGY-PRECOND-1 ────────────────────────────────

  it("COSMOLOGY-PRECOND-1: T3 409 SUPERCLUSTER_NOT_ACTIVE when parent SC isn't active", async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // tenantExists
      .mockResolvedValueOnce([
        [{ id: 1, supercluster_id: 4, code: 'GASTOS_EGRESOS', name: 'Gastos' }],
      ]) // findClusterByCode
      .mockResolvedValueOnce([[]]); // findUniverseSupercluster → never added
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes/5/clusters',
      headers: omegaHeader(),
      payload: { clusterCode: 'GASTOS_EGRESOS' },
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).code).toBe('SUPERCLUSTER_NOT_ACTIVE');
  });

  it('T3: Ω activates a cluster whose parent SC is ACTIVE — 200', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // tenantExists
      .mockResolvedValueOnce([
        [{ id: 1, supercluster_id: 4, code: 'GASTOS_EGRESOS', name: 'Gastos' }],
      ]) // findClusterByCode
      .mockResolvedValueOnce([[{ state: 'ACTIVE' }]]) // findUniverseSupercluster → ACTIVE
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // activateCluster UPSERT
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes/5/clusters',
      headers: omegaHeader(),
      payload: { clusterCode: 'GASTOS_EGRESOS' },
    });
    expect(res.statusCode).toBe(200);
  });

  // ─── T3b remove cluster ───────────────────────────────────────────────────

  it('T3b: Ω suspends a cluster, no cascade needed — 200', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // tenantExists
      .mockResolvedValueOnce([
        [{ id: 1, supercluster_id: 4, code: 'GASTOS_EGRESOS', name: 'Gastos' }],
      ]) // findClusterByCode
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // suspendCluster
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/5/clusters/GASTOS_EGRESOS',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(200);
  });

  // ─── T4 listados — COSMOLOGY-LIST-1 ──────────────────────────────────────

  it('COSMOLOGY-LIST-1: never-activated SC surfaces NEVER_ACTIVATED, distinct from SUSPENDED', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // tenantExists
      .mockResolvedValueOnce([
        [
          { code: 'CRM', name: 'Gestión de Relaciones', state: null },
          { code: 'FINANZAS', name: 'Finanzas y TCO', state: 'SUSPENDED' },
          { code: 'RASTREO', name: 'Rastreo y Rutas', state: 'ACTIVE' },
        ],
      ]); // listSuperclustersForTenant
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmology/universes/5/superclusters',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(200);
    const { data } = JSON.parse(res.body);
    expect(data).toEqual([
      { code: 'CRM', name: 'Gestión de Relaciones', state: 'NEVER_ACTIVATED' },
      { code: 'FINANZAS', name: 'Finanzas y TCO', state: 'SUSPENDED' },
      { code: 'RASTREO', name: 'Rastreo y Rutas', state: 'ACTIVE' },
    ]);
  });

  it('COSMOLOGY-LIST-2: GET superclusters — unknown tenant → 404 TENANT_NOT_FOUND (sendListResult !ok branch, 100% mandatorio FC162 F3)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]); // tenantExists → false
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmology/universes/999/superclusters',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('TENANT_NOT_FOUND');
  });

  it('T4: GET clusters accepts ?superclusterCode= filter — 200', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // tenantExists
      .mockResolvedValueOnce([
        [
          {
            code: 'GASTOS_EGRESOS',
            name: 'Gastos y Egresos',
            superclusterCode: 'FINANZAS',
            state: 'ACTIVE',
          },
        ],
      ]); // listClustersForTenant
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmology/universes/5/clusters?superclusterCode=FINANZAS',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toHaveLength(1);
  });

  it('T4: GET clusters — unknown tenant → 404 TENANT_NOT_FOUND (100% mandatorio, FC162 F3)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]); // tenantExists → empty
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmology/universes/999/clusters',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('TENANT_NOT_FOUND');
  });

  it('T4: GET clusters — never-activated cluster surfaces NEVER_ACTIVATED (100% mandatorio, FC162 F3)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // tenantExists
      .mockResolvedValueOnce([
        [
          {
            code: 'GASTOS_EGRESOS',
            name: 'Gastos y Egresos',
            superclusterCode: 'FINANZAS',
            state: null,
          },
        ],
      ]); // listClustersForTenant
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmology/universes/5/clusters',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data[0].state).toBe('NEVER_ACTIVATED');
  });

  // ─── Fase 2 — Universe_Create_And_Destroy (Cond.R-160-F2-Impl) ────────────

  const zeroCounts = {
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

  const f2NonOmegaCases: Array<{ method: 'GET' | 'POST' | 'DELETE'; url: string }> = [
    { method: 'POST', url: '/v1/cosmology/universes' },
    { method: 'DELETE', url: '/v1/cosmology/universes/5' },
    { method: 'GET', url: '/v1/cosmology/universes' },
  ];

  it.each(f2NonOmegaCases)(
    'COSMOLOGY-DESTROY-OMEGA: $method $url — 403 for non-Ω actor',
    async ({ method, url }) => {
      const res = await app.inject({
        method,
        url,
        headers: arcHeader(),
        payload:
          method === 'POST'
            ? { label: 'X', universeTypeCode: 'FMS', ownerTypeCode: 'FLOTILLA' }
            : undefined,
      });
      expect(res.statusCode).toBe(403);
    }
  );

  it('COSMOLOGY-CREATE-1: Ω creates a Universe — 201, single TX (mint + tenant + SC + Cúmulo blueprint)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 1, code: 'FMS', name: 'Fleet Management System' }]]) // findUniverseTypeByCode
      .mockResolvedValueOnce([[{ id: 1, code: 'FLOTILLA', name: 'Propietario de Flotilla' }]]); // findOwnerTypeByCode
    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 900, affectedRows: 1 }]) // mintUniverseTenantId
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // insertTenant
      .mockResolvedValueOnce([{ affectedRows: 5 }]) // seedSuperclusterBlueprint
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // seedClusterBlueprint
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes',
      headers: omegaHeader(),
      payload: { label: 'Nuevo Universo', universeTypeCode: 'FMS', ownerTypeCode: 'FLOTILLA' },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.tenantId).toBe(900);
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(mockConnection.execute).toHaveBeenCalledTimes(4);
  });

  // ── R4-C Fc165 F2 Slice 2.3B Batch 2 — cosmology.service.ts unc line 217 ──
  it('COSMOLOGY-CREATE-1b: label sin caracteres alfanuméricos → slug vacío, code cae a UNIV_X_<hex>', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 1, code: 'FMS', name: 'Fleet Management System' }]]) // findUniverseTypeByCode
      .mockResolvedValueOnce([[{ id: 1, code: 'FLOTILLA', name: 'Propietario de Flotilla' }]]); // findOwnerTypeByCode
    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 902, affectedRows: 1 }]) // mintUniverseTenantId
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // insertTenant
      .mockResolvedValueOnce([{ affectedRows: 5 }]) // seedSuperclusterBlueprint
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // seedClusterBlueprint
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes',
      headers: omegaHeader(),
      payload: { label: '!!!', universeTypeCode: 'FMS', ownerTypeCode: 'FLOTILLA' },
    });
    expect(res.statusCode).toBe(201);
    const mintCall = mockConnection.execute.mock.calls[0] as [string, unknown[]];
    expect(mintCall[1][0]).toMatch(/^UNIV_X_[0-9A-F]{6}$/);
  });

  it('COSMOLOGY-CREATE-2: unknown universeTypeCode — 404 UNIVERSE_TYPE_NOT_FOUND, no TX opened', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]); // findUniverseTypeByCode → not found
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes',
      headers: omegaHeader(),
      payload: { label: 'X', universeTypeCode: 'BOGUS', ownerTypeCode: 'FLOTILLA' },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('UNIVERSE_TYPE_NOT_FOUND');
    expect(mockConnection.beginTransaction).not.toHaveBeenCalled();
  });

  it('COSMOLOGY-CREATE-2b: unknown ownerTypeCode — 404 OWNER_TYPE_NOT_FOUND, no TX opened (100% mandatorio, FC162 F3)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 1, code: 'FMS', name: 'Fleet Management System' }]]) // findUniverseTypeByCode
      .mockResolvedValueOnce([[]]); // findOwnerTypeByCode → not found
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes',
      headers: omegaHeader(),
      payload: { label: 'X', universeTypeCode: 'FMS', ownerTypeCode: 'BOGUS' },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('OWNER_TYPE_NOT_FOUND');
    expect(mockConnection.beginTransaction).not.toHaveBeenCalled();
  });

  it('COSMOLOGY-CREATE-ROLLBACK-1 (FC162 F1-T6): T5 rolls back the whole TX if the blueprint seed fails', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 1, code: 'FMS', name: 'Fleet Management System' }]]) // findUniverseTypeByCode
      .mockResolvedValueOnce([[{ id: 1, code: 'FLOTILLA', name: 'Propietario de Flotilla' }]]); // findOwnerTypeByCode
    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 901, affectedRows: 1 }]) // mintUniverseTenantId
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // insertTenant
      .mockRejectedValueOnce(new Error('DB connection lost mid-seed')); // seedSuperclusterBlueprint
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes',
      headers: omegaHeader(),
      payload: { label: 'Nuevo Universo', universeTypeCode: 'FMS', ownerTypeCode: 'FLOTILLA' },
    });
    expect(res.statusCode).toBe(500);
    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.commit).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it('COSMOLOGY-DESTROY-FLEET-1: T6 409 UNIVERSE_NOT_ZERO_STATE with fleet_units populated (critical finding)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5, label: 'Poblado' }]]) // findTenantById
      .mockResolvedValueOnce([[{ ...zeroCounts, fleet_units: 3 }]]); // countZeroStateBuckets
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/5',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('UNIVERSE_NOT_ZERO_STATE');
    expect(body.details).toEqual({ fleet_units: 3 });
    expect(mockConnection.beginTransaction).not.toHaveBeenCalled();
  });

  it('COSMOLOGY-DESTROY-ARITY-1 (F2-I4-P1): countZeroStateBuckets binds one param per `?` placeholder', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5, label: 'Poblado' }]]) // findTenantById
      .mockResolvedValueOnce([[zeroCounts]]); // countZeroStateBuckets
    await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/5',
      headers: omegaHeader(),
    });
    const [sql, params] = (db.execute as Mock).mock.calls[1];
    const placeholderCount = (sql.match(/\?/g) ?? []).length;
    expect(params).toHaveLength(placeholderCount);
  });

  it.each([
    ['memberships', 1],
    ['role_assignments', 2],
    ['custom_roles', 1],
    ['areas', 4],
    ['service_links', 1],
    ['lattices', 1],
    ['social_posts', 7],
    ['social_reviews', 2],
  ])('COSMOLOGY-DESTROY-BUCKET: 409 when %s bucket is populated', async (bucket, count) => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5, label: 'Poblado' }]]) // findTenantById
      .mockResolvedValueOnce([[{ ...zeroCounts, [bucket]: count }]]); // countZeroStateBuckets
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/5',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).details).toEqual({ [bucket]: count });
  });

  it('COSMOLOGY-DESTROY-ZEROSTATE-1: T6 200 with all 10 buckets at zero — tenant + catalog row deleted', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 900, label: 'Vacío' }]]) // findTenantById
      .mockResolvedValueOnce([[zeroCounts]]); // countZeroStateBuckets
    mockConnection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // DELETE tenants
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE common_catalogs
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/900',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(200);
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(mockConnection.execute).toHaveBeenCalledTimes(2);
  });

  it('COSMOLOGY-DESTROY-ROLLBACK-1 (FC162 F1-T6): T6 rolls back if the common_catalogs cleanup fails', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 900, label: 'Vacío' }]]) // findTenantById
      .mockResolvedValueOnce([[zeroCounts]]); // countZeroStateBuckets
    mockConnection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // DELETE tenants
      .mockRejectedValueOnce(new Error('DB connection lost mid-cleanup')); // DELETE common_catalogs
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/900',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(500);
    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.commit).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it('COSMOLOGY-DESTROY-REASON-1 (FC161 R4): optional reason is passed to the audit log', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 900, label: 'Vacío' }]]) // findTenantById
      .mockResolvedValueOnce([[zeroCounts]]); // countZeroStateBuckets
    mockConnection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // DELETE tenants
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE common_catalogs
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/900',
      headers: omegaHeader(),
      payload: { reason: 'Universo de prueba, ya no se usa' },
    });
    expect(res.statusCode).toBe(200);
    const [, params] = (db.query as Mock).mock.calls[0];
    expect(params[6]).toBe('Universo de prueba, ya no se usa');
  });

  it('COSMOLOGY-DESTROY-REASON-2: reason omitted falls back to the fixed audit reason', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 900, label: 'Vacío' }]]) // findTenantById
      .mockResolvedValueOnce([[zeroCounts]]); // countZeroStateBuckets
    mockConnection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/900',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(200);
    const [, params] = (db.query as Mock).mock.calls[0];
    expect(params[6]).toBe('DESTROY_UNIVERSE (§24.5, zero-state)');
  });

  it('COSMOLOGY-DESTROY-REASON-3: reason shorter than 5 chars — 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/900',
      headers: omegaHeader(),
      payload: { reason: 'no' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('T6: unknown tenant — 404 TENANT_NOT_FOUND, no zero-state check run', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]); // findTenantById → not found
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/999',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('TENANT_NOT_FOUND');
  });

  it('T7: GET /universes lists every Universo with type + active SC/Cúmulo census', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 1,
          label: 'FMS Base',
          universeTypeCode: 'FMS',
          activeSuperclusters: 5,
          activeClusters: 1,
        },
      ],
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmology/universes',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toHaveLength(1);
  });

  // ─── VALIDATION_ERROR — Zod safeParse failure branches (100% mandatorio, FC162 F3) ──

  it('COSMOLOGY-VALIDATION-1: POST add supercluster with non-numeric tenantId — 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes/not-a-number/superclusters',
      headers: omegaHeader(),
      payload: { superclusterCode: 'FINANZAS' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });

  it('COSMOLOGY-VALIDATION-2: DELETE remove supercluster with non-numeric tenantId — 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/not-a-number/superclusters/FINANZAS',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });

  it('COSMOLOGY-VALIDATION-3: GET list superclusters with non-numeric tenantId — 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmology/universes/not-a-number/superclusters',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });

  it('COSMOLOGY-VALIDATION-4: POST add cluster with non-numeric tenantId — 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes/not-a-number/clusters',
      headers: omegaHeader(),
      payload: { clusterCode: 'GASTOS' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });

  it('COSMOLOGY-VALIDATION-5: DELETE remove cluster with non-numeric tenantId — 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/not-a-number/clusters/GASTOS',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });

  it('COSMOLOGY-VALIDATION-6: GET list clusters with non-numeric tenantId — 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmology/universes/not-a-number/clusters',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });

  it('COSMOLOGY-VALIDATION-7: POST create universe with empty label — 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmology/universes',
      headers: omegaHeader(),
      payload: { label: '', universeTypeCode: 'FMS', ownerTypeCode: 'FLOTILLA' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });

  it('COSMOLOGY-VALIDATION-8: DELETE destroy universe with non-numeric tenantId — 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmology/universes/not-a-number',
      headers: omegaHeader(),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });
});

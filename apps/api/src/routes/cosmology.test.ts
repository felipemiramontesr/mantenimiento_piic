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
});

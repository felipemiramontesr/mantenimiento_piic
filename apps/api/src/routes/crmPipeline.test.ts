/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * FC-8 CRM_Advanced_Modules FaseB — Pipeline de Negociaciones
 *
 * AT-CRM8-B-1: GET /crm/pipeline → 401 sin JWT
 * AT-CRM8-B-2: GET /crm/pipeline → 200 admin ve todos los stages con oportunidades
 * AT-CRM8-B-3: GET /crm/pipeline → 200 scoped ve solo owner_id=5
 * AT-CRM8-B-4: POST /crm/pipeline → 201 crea oportunidad válida
 * AT-CRM8-B-5: POST /crm/pipeline → 400 campos requeridos faltantes
 * AT-CRM8-B-6: POST /crm/pipeline → 403 cross-tenant
 * AT-CRM8-B-7: PATCH /crm/opportunities/:id/stage → 200 mueve a nuevo stage
 * AT-CRM8-B-8: DELETE /crm/opportunities/:id → 204 elimina oportunidad
 */

vi.mock('../services/db', () => ({
  default: { execute: vi.fn(), query: vi.fn(), getConnection: vi.fn() },
}));
vi.mock('../services/fleetService', () => ({
  default: {
    getUserOwnerIds: vi.fn().mockResolvedValue([5]),
    getAllUnits: vi.fn().mockResolvedValue([]),
    getUnitById: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn(() => Promise.resolve('hashed_pw')),
  verify: vi.fn(() => Promise.resolve(true)),
}));
vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc(${v})`),
    decrypt: vi.fn((v: string) => v.replace(/^enc\((.+)\)$/, '$1')),
    generateBlindIndex: vi.fn((v: string) => `SVR-${v.substring(0, 16).toUpperCase()}`),
  },
}));

const MOCK_STAGES = [
  { id: 1, code: 'PROSPECTING', label: 'Prospección', position: 1, color: '#6366f1' },
  { id: 2, code: 'QUALIFYING', label: 'Calificación', position: 2, color: '#3b82f6' },
  { id: 3, code: 'PROPOSAL', label: 'Propuesta', position: 3, color: '#f59e0b' },
  { id: 4, code: 'NEGOTIATING', label: 'Negociación', position: 4, color: '#f97316' },
  { id: 5, code: 'CLOSED_WON', label: 'Ganado', position: 5, color: '#10b981' },
  { id: 6, code: 'CLOSED_LOST', label: 'Perdido', position: 6, color: '#ef4444' },
];

const MOCK_OPP_ROW = {
  id: 1,
  owner_id: 5,
  stage_id: 3,
  title: 'Oportunidad Flota Norte',
  value_mxn: '150000.00',
  probability_pct: 70,
  assigned_to: null,
  notes: null,
  created_by: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('GET/POST/PATCH/DELETE /v1/crm/pipeline — FC-8 CRM_Advanced FaseB', () => {
  const app = buildApp();
  let adminToken: string;
  let scopedToken: string;
  let wrongOwnerToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    adminToken = jwt.sign({ id: 1, username: 'archon', roleId: 0, permissions: ['*'] });
    scopedToken = jwt.sign({
      id: 2,
      username: 'owner.user',
      roleId: 1,
      permissions: ['fleet:view'],
    });
    wrongOwnerToken = jwt.sign({
      id: 9,
      username: 'other.user',
      roleId: 1,
      permissions: ['fleet:view'],
    });
  });

  beforeEach(() => vi.clearAllMocks());

  it('AT-CRM8-B-1: GET /crm/pipeline → 401 sin JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/crm/pipeline' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-CRM8-B-2: GET /crm/pipeline → 200 admin ve stages con oportunidades', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([MOCK_STAGES])
      .mockResolvedValueOnce([[MOCK_OPP_ROW]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/pipeline',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body.stages)).toBe(true);
    expect(body.stages).toHaveLength(6);
    const proposalStage = body.stages.find((s: any) => s.code === 'PROPOSAL');
    expect(proposalStage.opportunities[0].title).toBe('Oportunidad Flota Norte');
  });

  it('AT-CRM8-B-3: GET /crm/pipeline → 200 scoped ve solo owner_id=5', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([MOCK_STAGES])
      .mockResolvedValueOnce([[{ owner_id: 5 }]])
      .mockResolvedValueOnce([[MOCK_OPP_ROW]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/pipeline',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    const allOpps = body.stages.flatMap((s: any) => s.opportunities);
    expect(allOpps.every((o: any) => o.ownerId === 5)).toBe(true);
  });

  it('AT-CRM8-B-4: POST /crm/pipeline → 201 crea oportunidad válida', async () => {
    (db.execute as any).mockResolvedValueOnce([{ insertId: 7, affectedRows: 1 }]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/pipeline',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { ownerId: 5, title: 'Nueva Oportunidad', valueMxn: 80000 },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).id).toBe(7);
  });

  it('AT-CRM8-B-5: POST /crm/pipeline → 400 campos requeridos faltantes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/pipeline',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { ownerId: 5 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('AT-CRM8-B-6: POST /crm/pipeline → 403 cross-tenant', async () => {
    (db.execute as any).mockResolvedValueOnce([[{ owner_id: 5 }]]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/pipeline',
      headers: { authorization: `Bearer ${wrongOwnerToken}`, 'content-type': 'application/json' },
      payload: { ownerId: 99, title: 'Hack' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('AT-CRM8-B-7: PATCH /crm/opportunities/:id/stage → 200 mueve stage', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]])
      .mockResolvedValueOnce([[{ id: 4 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/opportunities/1/stage',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { stageCode: 'NEGOTIATING' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).ok).toBe(true);
  });

  it('AT-CRM8-B-8: DELETE /crm/opportunities/:id → 204 elimina oportunidad', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/crm/opportunities/1',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it('AT-CRM8-B-9: DELETE /crm/opportunities/:id → 403 usuario sin acceso al owner', async () => {
    // wrongOwnerToken (id=9, fleet:view) — no admin → checks ownerIds
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]]) // SELECT opportunity — owner=5
      .mockResolvedValueOnce([[{ owner_id: 99 }]]); // getCallerOwnerIds(9) → [99], 5 not in [99]
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/crm/opportunities/1',
      headers: { authorization: `Bearer ${wrongOwnerToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('AT-CRM8-B-10: DELETE /crm/opportunities/:id → 500 error de DB', async () => {
    // adminToken has '*' → hasAdminAccess=true → skip ownerIds → DELETE throws
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]]) // SELECT opportunity
      .mockRejectedValueOnce(new Error('DB connection lost')); // DELETE throws
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/crm/opportunities/1',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('PIPELINE_DELETE_FAIL');
  });

  it('AT-CRM8-B-11: PATCH /crm/opportunities/:id/stage → 500 PIPELINE_MOVE_FAIL cuando DB falla (line 212)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]]) // SELECT opportunity
      .mockRejectedValueOnce(new Error('DB connection lost')); // SELECT stage throws
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/opportunities/1/stage',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ stageCode: 'PROSPECTING' }),
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('PIPELINE_MOVE_FAIL');
  });

  it('AT-CRM8-B-12: DELETE /crm/opportunities/:id → 401 sin JWT (line 221)', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/v1/crm/opportunities/1' });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('Session required');
  });

  it('AT-CRM8-B-13: PATCH /crm/opportunities/:id/stage → 401 sin JWT (lines 176-177)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/opportunities/1/stage',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ stageCode: 'PROSPECTING' }),
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('Session required');
  });

  it('AT-CRM8-B-14: PATCH /crm/opportunities/:id/stage → 403 FORBIDDEN usuario sin acceso al owner (lines 194-198)', async () => {
    // wrongOwnerToken (id=9, fleet:view) → hasAdminAccess=false → getCallerOwnerIds(9) → [99]
    // opportunity owner_id=5, [99].includes(5)=false → 403 FORBIDDEN
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]]) // SELECT opportunity
      .mockResolvedValueOnce([[{ owner_id: 99 }]]); // getCallerOwnerIds(9) → [99]
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/opportunities/1/stage',
      headers: { authorization: `Bearer ${wrongOwnerToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ stageCode: 'PROSPECTING' }),
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe('FORBIDDEN');
  });

  it('AT-CRM8-B-15: POST /crm/pipeline → 401 sin JWT (lines 130-131)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/pipeline',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ ownerId: 5, title: 'Test' }),
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('Session required');
  });

  it('AT-CRM8-B-16: POST /crm/pipeline → 500 PIPELINE_CREATE_FAIL cuando INSERT falla (lines 166-167)', async () => {
    // adminToken has '*' → hasAdminAccess=true → skip ownerIds → INSERT throws
    (db.execute as any).mockRejectedValueOnce(new Error('DB connection lost'));
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/pipeline',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ ownerId: 5, title: 'Oportunidad Critica' }),
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('PIPELINE_CREATE_FAIL');
  });

  it('AT-CRM8-B-17: GET /crm/pipeline scoped con ownerIds vacío → stages con oportunidades vacías (lines 93-96)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([MOCK_STAGES, undefined]) // SELECT stages
      .mockResolvedValueOnce([[], undefined]); // getCallerOwnerIds → empty
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/pipeline',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.stages).toHaveLength(MOCK_STAGES.length);
    body.stages.forEach((s: { opportunities: unknown[] }) => {
      expect(s.opportunities).toHaveLength(0);
    });
  });

  it('AT-CRM8-B-18: GET /crm/pipeline 500 PIPELINE_FETCH_FAIL cuando DB throws (lines 122-123)', async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB timeout'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/pipeline',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('PIPELINE_FETCH_FAIL');
  });

  it('AT-CRM8-B-19: PATCH /crm/opportunities/:id/stage 400 INVALID_STAGE cuando stage no existe (line 204)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }], undefined]) // SELECT opportunity
      .mockResolvedValueOnce([[], undefined]); // SELECT stage → empty → INVALID_STAGE
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/opportunities/1/stage',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ stageCode: 'NONEXISTENT_STAGE' }),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_STAGE');
  });

  it('AT-CRM8-B-20: DELETE /crm/opportunities/:id 400 Invalid id NaN (line 226)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/crm/opportunities/abc',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('Invalid id');
  });

  it('AT-CRM8-B-21: DELETE /crm/opportunities/:id 404 Not Found cuando oportunidad no existe (line 233)', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([[], undefined]); // SELECT → empty
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/crm/opportunities/999',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe('Not found');
  });
});

/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach, type Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';
import { buildRecallItem } from './fleetRecalls';
import type { RecallItem } from './fleetRecalls';

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => (v ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v: string) => `hash_${v}`),
  },
}));

vi.mock('../services/fleetService', () => ({
  default: { getUserOwnerIds: vi.fn().mockResolvedValue([]) },
}));

// FR-1..3: GET/POST/PATCH /fleet-units/:unitId/recalls — pure helper unit tests (FC-3 Fase 3D)

const baseRecall: RecallItem = {
  recall_id: 1,
  campaign_code: 'NIS-2021-0047',
  description: 'Falla en módulo airbag conductor — riesgo de despliegue inadvertido',
  make: 'NISSAN',
  model: 'NP300',
  year: 2021,
  published_date: '2021-08-15',
  status: 'PENDING',
  resolved_at: null,
  work_order_id: null,
};

describe('buildRecallItem (FR-1..3)', () => {
  it('FR-1: devuelve shape correcta con todos los campos del catálogo y estado', () => {
    const result = buildRecallItem(baseRecall);
    expect(result.recall_id).toBe(1);
    expect(result.campaign_code).toBe('NIS-2021-0047');
    expect(result.make).toBe('NISSAN');
    expect(result.model).toBe('NP300');
    expect(result.year).toBe(2021);
    expect(result.status).toBe('PENDING');
    expect(result.published_date).toBe('2021-08-15');
  });

  it('FR-2: resolved_at y work_order_id son null cuando no están asignados', () => {
    const result = buildRecallItem(baseRecall);
    expect(result.resolved_at).toBeNull();
    expect(result.work_order_id).toBeNull();
  });

  it('FR-3: recall COMPLETED incluye resolved_at y work_order_id cuando están presentes', () => {
    const completed: RecallItem = {
      ...baseRecall,
      status: 'COMPLETED',
      resolved_at: '2026-06-01',
      work_order_id: 42,
    };
    const result = buildRecallItem(completed);
    expect(result.status).toBe('COMPLETED');
    expect(result.resolved_at).toBe('2026-06-01');
    expect(result.work_order_id).toBe(42);
  });

  it('FR-4: NOT_APPLICABLE mantiene resolved_at null', () => {
    const na: RecallItem = { ...baseRecall, status: 'NOT_APPLICABLE' };
    const result = buildRecallItem(na);
    expect(result.status).toBe('NOT_APPLICABLE');
    expect(result.resolved_at).toBeNull();
  });
});

// ─── POST + PATCH /v1/fleet-units/:unitId/recalls — route integration tests ──

describe('FR-ROUTE: POST + PATCH /v1/fleet-units/:unitId/recalls', () => {
  const app = buildApp();
  let adminToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as any;
    adminToken = jwt.sign({ id: 1, username: 'archon', roleId: 0, permissions: ['*'] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── POST ─────────────────────────────────────────────────────────────────

  it('FR-POST-1: body inválido (sin recallId) → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/fleet-units/PIIC-101/recalls',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ recallId: -1 }), // negativo → z.number().positive() falla
    });
    expect(res.statusCode).toBe(400);
  });

  it('FR-POST-2: recall no existe en catálogo → 404', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]); // catalog_recalls empty → not found
    const res = await app.inject({
      method: 'POST',
      url: '/v1/fleet-units/PIIC-101/recalls',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ recallId: 999 }),
    });
    expect(res.statusCode).toBe(404);
  });

  it('FR-POST-3: recall ya asignado → 409 duplicate', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // catalog_recalls found
      .mockRejectedValueOnce(Object.assign(new Error('Dup'), { code: 'ER_DUP_ENTRY' }));
    const res = await app.inject({
      method: 'POST',
      url: '/v1/fleet-units/PIIC-101/recalls',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ recallId: 5 }),
    });
    expect(res.statusCode).toBe(409);
  });

  it('FR-POST-4: recall válido, inserción exitosa → 201', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // catalog_recalls found
      .mockResolvedValueOnce([{ insertId: 10 }]); // INSERT success
    const res = await app.inject({
      method: 'POST',
      url: '/v1/fleet-units/PIIC-101/recalls',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ recallId: 5 }),
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  // ─── PATCH ────────────────────────────────────────────────────────────────

  it('FR-PATCH-1: status inválido → 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/fleet-units/PIIC-101/recalls/5',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'INVALID_STATUS' }),
    });
    expect(res.statusCode).toBe(400);
  });

  it('FR-PATCH-2: recall no encontrado (0 afectedRows) → 404', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/fleet-units/PIIC-101/recalls/5',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    expect(res.statusCode).toBe(404);
  });

  it('FR-PATCH-3: actualización exitosa → 200', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/fleet-units/PIIC-101/recalls/5',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED', workOrderId: 42 }),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('FR-POST-5: error de DB genérico (no ER_DUP_ENTRY) → 500', async () => {
    // resolveOwnerScope: adminToken → null (0 DB calls); verifyUnitAccess: null → true (0 DB calls)
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 5 }]]) // SELECT catalog → found
      .mockRejectedValueOnce(new Error('Connection lost')); // INSERT → generic error
    const res = await app.inject({
      method: 'POST',
      url: '/v1/fleet-units/PIIC-101/recalls',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ recallId: 5 }),
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('Internal error linking recall');
  });

  it('FR-PATCH-4: error de DB en UPDATE → 500', async () => {
    // resolveOwnerScope: adminToken → null; verifyUnitAccess: null → true; UPDATE throws
    (db.execute as Mock).mockRejectedValueOnce(new Error('Connection lost'));
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/fleet-units/PIIC-101/recalls/5',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('Internal error updating recall');
  });
});

// ─── GET /v1/fleet-units/:unitId/recalls — branch coverage (lines 64-100) ───

describe('FR-GET: GET /v1/fleet-units/:unitId/recalls', () => {
  const app = buildApp();
  let adminToken: string;
  let scopedToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as any;
    adminToken = jwt.sign({ id: 1, username: 'archon', roleId: 0, permissions: ['*'] });
    scopedToken = jwt.sign({
      id: 2,
      username: 'scoped.user',
      roleId: 1,
      permissions: ['fleet:scoped', 'intelligence:recall:view'],
    });
  });

  beforeEach(() => vi.clearAllMocks());

  it('FR-GET-1: GET /fleet-units/:unitId/recalls → 200 admin ve recalls (lines 76-95)', async () => {
    const recallRow = {
      recall_id: 1,
      campaign_code: 'NIS-2021-0047',
      description: 'Falla airbag',
      make: 'NISSAN',
      model: 'NP300',
      year: 2021,
      published_date: '2021-08-15',
      status: 'PENDING',
      resolved_at: null,
      work_order_id: null,
    };
    (db.execute as Mock).mockResolvedValueOnce([[recallRow]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/PIIC-101/recalls',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
    expect(body.data[0].campaign_code).toBe('NIS-2021-0047');
  });

  it('FR-GET-2: GET /fleet-units/:unitId/recalls → 401 sin JWT (lines 68-69)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/fleet-units/PIIC-101/recalls' });
    expect(res.statusCode).toBe(401);
  });

  it('FR-GET-3: GET /fleet-units/:unitId/recalls → 403 usuario sin owners asignados (line 80)', async () => {
    // scopedToken has fleet:scoped → resolveOwnerScope calls FleetService.getUserOwnerIds → []
    // verifyUnitAccess(unitId, []) → ownerScope.length===0 → false → 403
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/PIIC-101/recalls',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).error).toBe('Access denied');
  });

  it('FR-GET-4: GET /fleet-units/:unitId/recalls → 500 cuando DB falla (lines 96-99)', async () => {
    // adminToken → scope=null → verifyUnitAccess=true → db.execute throws
    (db.execute as Mock).mockRejectedValueOnce(new Error('Connection lost'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/PIIC-101/recalls',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).error).toBe('Internal error retrieving recalls');
  });
});

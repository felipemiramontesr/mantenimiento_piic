/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * FC-8 CRM_Advanced_Modules FaseA — Contratos y SLAs
 *
 * AT-CRM8-A-1: GET /crm/contracts → 401 sin JWT
 * AT-CRM8-A-2: GET /crm/contracts → 200 admin ve todos
 * AT-CRM8-A-3: GET /crm/contracts → 200 scoped ve solo owner_id=5
 * AT-CRM8-A-4: POST /crm/contracts → 201 crea contrato válido
 * AT-CRM8-A-5: POST /crm/contracts → 400 campos requeridos faltantes
 * AT-CRM8-A-6: POST /crm/contracts → 403 cross-tenant
 * AT-CRM8-A-7: PATCH /crm/contracts/:id → 200 actualiza status
 * AT-CRM8-A-8: DELETE /crm/contracts/:id → 204 soft delete (CANCELLED)
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

const MOCK_CONTRACT_ROW = {
  id: 1,
  owner_id: 5,
  unit_id: null,
  title: 'Contrato Mantenimiento Anual',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  sla_hours: 24,
  status: 'ACTIVE',
  notes: null,
  created_by: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('GET/POST/PATCH/DELETE /v1/crm/contracts — FC-8 CRM_Advanced FaseA', () => {
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

  it('AT-CRM8-A-1: GET /crm/contracts → 401 sin JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/crm/contracts' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-CRM8-A-2: GET /crm/contracts → 200 admin ve todos', async () => {
    (db.execute as any).mockResolvedValueOnce([[MOCK_CONTRACT_ROW]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/contracts',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body.contracts)).toBe(true);
    expect(body.contracts[0].title).toBe('Contrato Mantenimiento Anual');
  });

  it('AT-CRM8-A-3: GET /crm/contracts → 200 scoped ve solo owner_id=5', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ owner_id: 5 }]])
      .mockResolvedValueOnce([[MOCK_CONTRACT_ROW]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/contracts',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.contracts.every((c: any) => c.ownerId === 5)).toBe(true);
  });

  it('AT-CRM8-A-4: POST /crm/contracts → 201 crea contrato válido', async () => {
    (db.execute as any).mockResolvedValueOnce([{ insertId: 42, affectedRows: 1 }]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/contracts',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: {
        ownerId: 5,
        title: 'Contrato Test',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).id).toBe(42);
  });

  it('AT-CRM8-A-5: POST /crm/contracts → 400 campos requeridos faltantes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/contracts',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { ownerId: 5 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('AT-CRM8-A-6: POST /crm/contracts → 403 cross-tenant', async () => {
    (db.execute as any).mockResolvedValueOnce([[{ owner_id: 5 }]]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/contracts',
      headers: { authorization: `Bearer ${wrongOwnerToken}`, 'content-type': 'application/json' },
      payload: { ownerId: 99, title: 'Hack', startDate: '2026-01-01', endDate: '2026-12-31' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('AT-CRM8-A-7: PATCH /crm/contracts/:id → 200 actualiza status', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/contracts/1',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { status: 'EXPIRED' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).ok).toBe(true);
  });

  it('AT-CRM8-A-8: DELETE /crm/contracts/:id → 204 soft delete', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/crm/contracts/1',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it('AT-CRM8-A-9: DELETE /crm/contracts/:id → 403 usuario sin acceso al owner', async () => {
    // scopedToken (id=2, fleet:view) — no admin → checks ownerIds
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 99 }]]) // SELECT contract — owner=99
      .mockResolvedValueOnce([[{ owner_id: 5 }]]); // getCallerOwnerIds(2) → [5], 99 not in [5]
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/crm/contracts/1',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('AT-CRM8-A-10: DELETE /crm/contracts/:id → 500 error de DB', async () => {
    // adminToken has '*' → hasAdminAccess=true → skip ownerIds → UPDATE throws
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]]) // SELECT contract
      .mockRejectedValueOnce(new Error('DB connection lost')); // UPDATE throws
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/crm/contracts/1',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('CONTRACTS_DELETE_FAIL');
  });

  it('AT-CRM8-A-11: PATCH /crm/contracts/:id → 500 CONTRACTS_UPDATE_FAIL cuando UPDATE falla (line 196)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]]) // SELECT contract
      .mockRejectedValueOnce(new Error('DB connection lost')); // UPDATE throws
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/contracts/1',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ status: 'ACTIVE' }),
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('CONTRACTS_UPDATE_FAIL');
  });

  it('AT-CRM8-A-12: DELETE /crm/contracts/:id → 401 sin JWT (line 205)', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/v1/crm/contracts/1' });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('Session required');
  });

  it('AT-CRM8-A-13: PATCH /crm/contracts/:id → 200 con slaHours (lines 182-184)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/contracts/1',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ slaHours: 48 }),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
  });

  it('AT-CRM8-A-14: PATCH /crm/contracts/:id → 200 con notes (lines 185-188)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/contracts/1',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ notes: 'Contrato renovado para 2027' }),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
  });

  it('AT-CRM8-A-15: PATCH /crm/contracts/:id → 200 con title (lines 170-172)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/contracts/1',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ title: 'Contrato Actualizado 2027' }),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
  });

  it('AT-CRM8-A-16: PATCH /crm/contracts/:id → 200 con endDate (lines 178-180)', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/contracts/1',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ endDate: '2027-12-31' }),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
  });

  it('AT-CRM8-A-17: PATCH /crm/contracts/:id → 401 sin JWT (line 144)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/contracts/1',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ status: 'ACTIVE' }),
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('Session required');
  });

  it('AT-CRM8-A-18: PATCH /crm/contracts/abc → 400 id NaN (line 149)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/contracts/abc',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ status: 'ACTIVE' }),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('Invalid id');
  });

  it('AT-CRM8-A-19: PATCH /crm/contracts/:id → 400 NO_FIELDS cuerpo vacío (line 190)', async () => {
    (db.execute as any).mockResolvedValueOnce([[{ id: 1, owner_id: 5 }]]);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/crm/contracts/1',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('NO_FIELDS');
  });
});

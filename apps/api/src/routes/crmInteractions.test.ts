/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * FC-8 CRM_Advanced_Modules FaseC — Bitácora Forense de Interacciones
 *
 * AT-CRM8-C-1: GET /crm/interactions → 401 sin JWT
 * AT-CRM8-C-2: GET /crm/interactions → 200 admin ve todas las interacciones
 * AT-CRM8-C-3: GET /crm/interactions → 200 scoped ve solo owner_id=5
 * AT-CRM8-C-4: POST /crm/interactions → 201 crea interacción válida
 * AT-CRM8-C-5: POST /crm/interactions → 400 campos requeridos faltantes
 * AT-CRM8-C-6: POST /crm/interactions → 403 cross-tenant
 * AT-CRM8-C-7: POST /crm/interactions → 400 PII detectada (placa en summary)
 * AT-CRM8-C-8: GET /crm/interactions → 200 filtro date range ?from=&to=
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

const MOCK_INTERACTION = {
  id: 1,
  owner_id: 5,
  contact_id: null,
  type: 'CALL',
  summary: 'Llamada de seguimiento al cliente.',
  created_by: 1,
  created_at: '2026-01-15T10:00:00Z',
};

describe('GET/POST /v1/crm/interactions — FC-8 CRM_Advanced FaseC', () => {
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

  it('AT-CRM8-C-1: GET /crm/interactions → 401 sin JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/crm/interactions' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-CRM8-C-2: GET /crm/interactions → 200 admin ve todas', async () => {
    (db.execute as any).mockResolvedValueOnce([[MOCK_INTERACTION]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/interactions',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body.interactions)).toBe(true);
    expect(body.interactions[0].type).toBe('CALL');
  });

  it('AT-CRM8-C-3: GET /crm/interactions → 200 scoped owner_id=5', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ owner_id: 5 }]])
      .mockResolvedValueOnce([[MOCK_INTERACTION]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/interactions',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.interactions.every((i: any) => i.ownerId === 5)).toBe(true);
  });

  it('AT-CRM8-C-4: POST /crm/interactions → 201 crea interacción válida', async () => {
    (db.execute as any).mockResolvedValueOnce([{ insertId: 3, affectedRows: 1 }]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/interactions',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { ownerId: 5, type: 'MEETING', summary: 'Reunión de revisión de servicio.' },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).id).toBe(3);
  });

  it('AT-CRM8-C-5: POST /crm/interactions → 400 campos requeridos faltantes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/interactions',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { ownerId: 5 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('AT-CRM8-C-6: POST /crm/interactions → 403 cross-tenant', async () => {
    (db.execute as any).mockResolvedValueOnce([[{ owner_id: 5 }]]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/interactions',
      headers: { authorization: `Bearer ${wrongOwnerToken}`, 'content-type': 'application/json' },
      payload: { ownerId: 99, summary: 'Intento de acceso cruzado.' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('AT-CRM8-C-7: POST /crm/interactions → 400 PII detectada (placa en summary)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/interactions',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: { ownerId: 5, summary: 'El vehículo ABC-1234 requiere revisión urgente.' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('PII_DETECTED_IN_SUMMARY');
  });

  it('AT-CRM8-C-8: GET /crm/interactions → 200 filtro date range', async () => {
    (db.execute as any).mockResolvedValueOnce([[MOCK_INTERACTION]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/interactions?from=2026-01-01&to=2026-01-31',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.interactions).toHaveLength(1);
  });

  it('AT-CRM8-C-9: POST /crm/interactions → 401 sin JWT (lines 114-115)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/interactions',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ ownerId: 5, summary: 'Llamada de seguimiento' }),
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('Session required');
  });

  it('AT-CRM8-C-10: POST /crm/interactions → 500 INTERACTIONS_CREATE_FAIL cuando INSERT falla (lines 144-145)', async () => {
    (db.execute as any).mockRejectedValueOnce(new Error('DB connection lost'));
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/interactions',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ ownerId: 5, summary: 'Llamada crítica de prueba' }),
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('INTERACTIONS_CREATE_FAIL');
  });

  it('AT-CRM8-C-11: GET /crm/interactions → 500 INTERACTIONS_FETCH_FAIL cuando DB throws (lines 105-107)', async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB connection lost'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/interactions',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('INTERACTIONS_FETCH_FAIL');
  });

  it('AT-CRM8-C-12: GET /crm/interactions → 200 scoped user empty ownerIds → {interactions:[]} (line 88)', async () => {
    // scoped user → getCallerOwnerIds → [] → ownerIds.length===0 → early return
    (db.execute as any).mockResolvedValueOnce([[]]); // getCallerOwnerIds → []
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/interactions',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).interactions).toEqual([]);
  });

  it('AT-CRM8-C-13: POST /crm/interactions no body → 400 MISSING_REQUIRED_FIELDS (line 118 ?? {} branch)', async () => {
    // null body → null ?? {} → {} → !ownerId → 400
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/interactions',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('MISSING_REQUIRED_FIELDS');
  });
});

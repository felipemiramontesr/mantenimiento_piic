/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * FC-8 CRM_Advanced_Modules FaseE — Módulo de Campañas y Envío Outbox
 *
 * AT-CRM8-E-1: GET /crm/campaigns → 401 sin JWT
 * AT-CRM8-E-2: GET /crm/campaigns → 200 admin ve todas las plantillas
 * AT-CRM8-E-3: GET /crm/campaigns → 200 scoped ve solo sus plantillas
 * AT-CRM8-E-4: POST /crm/campaigns → 400 missing required fields
 * AT-CRM8-E-5: POST /crm/campaigns → 400 PII_DETECTED_IN_TEMPLATE (body_text con placa)
 * AT-CRM8-E-6: POST /crm/campaigns → 201 created con campo type válido
 * AT-CRM8-E-7: POST /crm/campaigns/:id/send → 201 queued → outbox INSERT
 * AT-CRM8-E-8: POST /crm/campaigns/:id/send → 403 si template no pertenece al owner
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
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return { ...actual, randomUUID: vi.fn(() => 'test-uuid-1234-5678-abcd-ef0123456789') };
});

const MOCK_CAMPAIGN = {
  id: 1,
  owner_id: 5,
  name: 'Recordatorio Mantenimiento',
  subject: 'Su próximo servicio está por vencer',
  body_text: 'Estimado cliente, le informamos que su servicio preventivo vence pronto.',
  type: 'MAINTENANCE_REMINDER',
  created_by: 2,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
};

describe('GET|POST /v1/crm/campaigns — FC-8 CRM_Advanced FaseE', () => {
  const app = buildApp();
  let adminToken: string;
  let scopedToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    adminToken = jwt.sign({ id: 1, username: 'archon', roleId: 0, permissions: ['*'] });
    scopedToken = jwt.sign({ id: 2, username: 'field.user', roleId: 1, permissions: ['crm:view'] });
  });

  beforeEach(() => vi.clearAllMocks());

  it('AT-CRM8-E-1: GET /crm/campaigns → 401 sin JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/crm/campaigns' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-CRM8-E-2: GET /crm/campaigns → 200 admin ve todas las plantillas', async () => {
    (db.execute as any).mockResolvedValueOnce([[MOCK_CAMPAIGN]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/campaigns',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body.campaigns)).toBe(true);
    expect(body.campaigns[0].name).toBe('Recordatorio Mantenimiento');
  });

  it('AT-CRM8-E-3: GET /crm/campaigns → 200 scoped ve solo sus plantillas', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ owner_id: 5 }]])
      .mockResolvedValueOnce([[MOCK_CAMPAIGN]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/campaigns',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).campaigns.length).toBe(1);
  });

  it('AT-CRM8-E-4: POST /crm/campaigns → 400 MISSING_REQUIRED_FIELDS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/campaigns',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ ownerId: 5, name: 'Solo nombre' }),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('MISSING_REQUIRED_FIELDS');
  });

  it('AT-CRM8-E-5: POST /crm/campaigns → 400 PII_DETECTED_IN_TEMPLATE (placa en body_text)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/campaigns',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({
        ownerId: 5,
        name: 'Test PII',
        subject: 'Recordatorio',
        bodyText: 'La unidad ABC-1234 requiere mantenimiento.',
        type: 'MAINTENANCE_REMINDER',
      }),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('PII_DETECTED_IN_TEMPLATE');
  });

  it('AT-CRM8-E-6: POST /crm/campaigns → 201 created', async () => {
    (db.execute as any).mockResolvedValueOnce([{ insertId: 99 }]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/campaigns',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({
        ownerId: 5,
        name: 'Campaña Vencimiento',
        subject: 'Su contrato vence pronto',
        bodyText: 'Le informamos que su contrato de servicio está próximo a vencer.',
        type: 'CONTRACT_EXPIRY',
      }),
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).id).toBe(99);
  });

  it('AT-CRM8-E-7: POST /crm/campaigns/:id/send → 201 queued en notifications_outbox', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5, type: 'MAINTENANCE_REMINDER' }]])
      .mockResolvedValueOnce([{ insertId: 42 }]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/campaigns/1/send',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.queued).toBe(true);
    expect(body.outboxId).toBe(42);
  });

  it('AT-CRM8-E-8: POST /crm/campaigns/:id/send → 403 cross-owner', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 9, type: 'QUOTATION' }]])
      .mockResolvedValueOnce([[{ owner_id: 5 }]]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/campaigns/1/send',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).error).toBe('FORBIDDEN');
  });

  it('AT-CRM8-E-9: POST /crm/campaigns → 500 CAMPAIGNS_CREATE_FAIL cuando INSERT falla', async () => {
    (db.execute as any).mockRejectedValueOnce(new Error('DB insert failed'));
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/campaigns',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({
        ownerId: 5,
        name: 'Campaña Error',
        subject: 'Error test',
        bodyText: 'Error de inserción de prueba.',
        type: 'MAINTENANCE_REMINDER',
      }),
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).error).toBe('CAMPAIGNS_CREATE_FAIL');
  });

  it('AT-CRM8-E-10: POST /crm/campaigns/:id/send → 500 CAMPAIGNS_SEND_FAIL cuando outbox INSERT falla', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ id: 1, owner_id: 5, type: 'MAINTENANCE_REMINDER' }]]) // find template
      .mockRejectedValueOnce(new Error('DB outbox insert failed')); // outbox INSERT throws
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/campaigns/1/send',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).error).toBe('CAMPAIGNS_SEND_FAIL');
  });

  it('AT-CRM8-E-11: POST /crm/campaigns → 400 INVALID_CAMPAIGN_TYPE cuando type no válido (lines 113-115)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/campaigns',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({
        ownerId: 5,
        name: 'Test',
        subject: 'Asunto',
        bodyText: 'Texto de prueba de campaña.',
        type: 'TIPO_INVALIDO',
      }),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('INVALID_CAMPAIGN_TYPE');
  });

  it('AT-CRM8-E-12: POST /crm/campaigns → 403 FORBIDDEN usuario sin acceso al owner (lines 123-127)', async () => {
    // scopedToken (id=2, crm:view) → !hasAdminAccess → getCallerOwnerIds(2) → [5]
    // ownerId=99, [5].includes(99)=false → 403 FORBIDDEN
    (db.execute as any).mockResolvedValueOnce([[{ owner_id: 5 }]]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/campaigns',
      headers: { authorization: `Bearer ${scopedToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({
        ownerId: 99,
        name: 'Campaña Ajena',
        subject: 'Asunto',
        bodyText: 'Texto de prueba de campaña ajena.',
        type: 'MAINTENANCE_REMINDER',
      }),
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).error).toBe('FORBIDDEN');
  });

  it('AT-CRM8-E-13: POST /crm/campaigns/:id/send → 401 sin JWT (lines 145-146)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/campaigns/1/send',
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error).toBe('Session required');
  });

  it('AT-CRM8-E-14: GET /crm/campaigns → 500 CAMPAIGNS_FETCH_FAIL cuando DB throws (lines 95-96)', async () => {
    (db.execute as any).mockRejectedValueOnce(new Error('DB connection lost'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/campaigns',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).error).toBe('CAMPAIGNS_FETCH_FAIL');
  });

  it('AT-CRM8-E-15: POST /crm/campaigns → 401 sin JWT (lines 103-104)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/campaigns',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ ownerId: 5, name: 'Test', subject: 'Test', bodyText: 'Cuerpo' }),
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error).toBe('Session required');
  });

  it('AT-CRM8-E-16: GET /crm/campaigns scoped con ownerIds vacío → 200 campaigns:[] (line 86)', async () => {
    (db.execute as any).mockResolvedValueOnce([[], undefined]); // getCallerOwnerIds → empty
    const res = await app.inject({
      method: 'GET',
      url: '/v1/crm/campaigns',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).campaigns).toHaveLength(0);
  });

  it('AT-CRM8-E-17: POST /crm/campaigns 201 sin type → type ?? MAINTENANCE_REMINDER (line 133)', async () => {
    (db.execute as any).mockResolvedValueOnce([{ insertId: 77 }]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/campaigns',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({
        ownerId: 5,
        name: 'Campaña sin tipo',
        subject: 'Recordatorio de mantenimiento',
        bodyText: 'Estimado cliente, le recordamos que su vehículo requiere revisión.',
      }),
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).id).toBe(77);
  });

  it('AT-CRM8-E-18: POST /crm/campaigns/:id/send 404 CAMPAIGN_NOT_FOUND (line 157)', async () => {
    (db.execute as any).mockResolvedValueOnce([[], undefined]); // SELECT → empty
    const res = await app.inject({
      method: 'POST',
      url: '/v1/crm/campaigns/999/send',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).error).toBe('CAMPAIGN_NOT_FOUND');
  });
});

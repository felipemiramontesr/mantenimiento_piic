/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * FC-8 CRM_Advanced_Modules FaseD — Portal de Clientes Autogestionable
 *
 * AT-CRM8-D-1: GET /portal/fleet-status → 401 sin JWT
 * AT-CRM8-D-2: GET /portal/fleet-status → 403 si roleId != 4 (admin)
 * AT-CRM8-D-3: GET /portal/fleet-status → 200 roleId=4 ve sus unidades (sin datos financieros)
 * AT-CRM8-D-4: GET /portal/fleet-status → 403 cross-tenant (X-Owner-Id spoofed)
 * AT-CRM8-D-5: GET /portal/work-orders → 401 sin JWT
 * AT-CRM8-D-6: GET /portal/work-orders → 403 si roleId != 4 (scoped no-portal)
 * AT-CRM8-D-7: GET /portal/work-orders → 200 roleId=4 ve sus OTs
 * AT-CRM8-D-8: GET /portal/fleet-status → response NO contiene campos financieros
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

const MOCK_UNIT = {
  id: 'VIM001',
  owner_id: 5,
  brand: 'Caterpillar',
  model: '336',
  year: 2020,
  status: 'Disponible',
};

const MOCK_WORK_ORDER = {
  id: 1,
  unit_id: 'VIM001',
  type: 'MAINTENANCE',
  start_datetime: '2026-01-10T08:00:00Z',
  end_datetime: '2026-01-10T16:00:00Z',
};

describe('GET /v1/portal/* — FC-8 CRM_Advanced FaseD', () => {
  const app = buildApp();
  let adminToken: string;
  let scopedToken: string;
  let portalToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    adminToken = jwt.sign({ id: 1, username: 'archon', roleId: 0, permissions: ['*'] });
    scopedToken = jwt.sign({
      id: 2,
      username: 'field.user',
      roleId: 1,
      permissions: ['fleet:view'],
    });
    portalToken = jwt.sign({ id: 3, username: 'client.user', roleId: 4, permissions: [] });
  });

  beforeEach(() => vi.clearAllMocks());

  it('AT-CRM8-D-1: GET /portal/fleet-status → 401 sin JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/portal/fleet-status' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-CRM8-D-2: GET /portal/fleet-status → 403 admin (roleId=0)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/portal/fleet-status',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).error).toBe('PORTAL_ACCESS_DENIED');
  });

  it('AT-CRM8-D-3: GET /portal/fleet-status → 200 roleId=4 ve sus unidades', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ owner_id: 5 }]])
      .mockResolvedValueOnce([[MOCK_UNIT]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/portal/fleet-status',
      headers: { authorization: `Bearer ${portalToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body.units)).toBe(true);
    expect(body.units[0].id).toBe('VIM001');
  });

  it('AT-CRM8-D-4: GET /portal/fleet-status → 403 X-Owner-Id spoofed', async () => {
    (db.execute as any).mockResolvedValueOnce([[{ owner_id: 5 }]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/portal/fleet-status',
      headers: { authorization: `Bearer ${portalToken}`, 'x-owner-id': '9' },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).error).toBe('CROSS_TENANT_BLOCKED');
  });

  it('AT-CRM8-D-5: GET /portal/work-orders → 401 sin JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/portal/work-orders' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-CRM8-D-6: GET /portal/work-orders → 403 roleId=1 (no-portal)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/portal/work-orders',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).error).toBe('PORTAL_ACCESS_DENIED');
  });

  it('AT-CRM8-D-7: GET /portal/work-orders → 200 roleId=4 ve sus OTs', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ owner_id: 5 }]])
      .mockResolvedValueOnce([[MOCK_WORK_ORDER]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/portal/work-orders',
      headers: { authorization: `Bearer ${portalToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body.workOrders)).toBe(true);
    expect(body.workOrders[0].unitId).toBe('VIM001');
  });

  it('AT-CRM8-D-8: GET /portal/fleet-status → no expone campos financieros', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ owner_id: 5 }]])
      .mockResolvedValueOnce([[MOCK_UNIT]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/portal/fleet-status',
      headers: { authorization: `Bearer ${portalToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    const unit = body.units[0];
    // Verifica ausencia de campos financieros
    expect(unit.acquisitionCost).toBeUndefined();
    expect(unit.insuranceValue).toBeUndefined();
    expect(unit.totalCostOfOwnership).toBeUndefined();
    expect(unit.cost).toBeUndefined();
  });

  it('AT-CRM8-D-9: GET /portal/fleet-status → 500 PORTAL_FLEET_FAIL cuando DB falla', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ owner_id: 5 }]]) // getCallerOwnerIds → ownerIds=[5]
      .mockRejectedValueOnce(new Error('DB connection lost')); // fleet query → catch
    const res = await app.inject({
      method: 'GET',
      url: '/v1/portal/fleet-status',
      headers: { authorization: `Bearer ${portalToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).error).toBe('PORTAL_FLEET_FAIL');
  });

  it('AT-CRM8-D-10: GET /portal/work-orders → 500 PORTAL_ORDERS_FAIL cuando DB falla', async () => {
    (db.execute as any)
      .mockResolvedValueOnce([[{ owner_id: 5 }]]) // getCallerOwnerIds → ownerIds=[5]
      .mockRejectedValueOnce(new Error('DB connection lost')); // work-orders query → catch
    const res = await app.inject({
      method: 'GET',
      url: '/v1/portal/work-orders',
      headers: { authorization: `Bearer ${portalToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).error).toBe('PORTAL_ORDERS_FAIL');
  });

  it('AT-CRM8-D-11: GET /portal/fleet-status → 200 { units: [] } cuando ownerIds vacío (line 65)', async () => {
    (db.execute as any).mockResolvedValueOnce([[]]); // getCallerOwnerIds → ownerIds=[]
    const res = await app.inject({
      method: 'GET',
      url: '/v1/portal/fleet-status',
      headers: { authorization: `Bearer ${portalToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).units).toEqual([]);
  });

  it('AT-CRM8-D-12: GET /portal/work-orders → 200 { workOrders: [] } cuando ownerIds vacío (line 103)', async () => {
    (db.execute as any).mockResolvedValueOnce([[]]); // getCallerOwnerIds → ownerIds=[]
    const res = await app.inject({
      method: 'GET',
      url: '/v1/portal/work-orders',
      headers: { authorization: `Bearer ${portalToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).workOrders).toEqual([]);
  });
});

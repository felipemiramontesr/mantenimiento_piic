import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

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
    decrypt: vi.fn((v: string) => (v && typeof v === 'string' ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v: string) => `hash_${v}`),
  },
}));

const OWNER_ID = 42;
const UNIT_ID = 'PIIC-101';
const LAT = 25.6866;
const LNG = -100.3161;

describe('FC-3 Realtime_Telemetry FaseB — POST /v1/telemetry/ping + GET /v1/telemetry/units', () => {
  const app = buildApp();
  let userToken: string;
  let adminToken: string;
  let otherToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    userToken = jwt.sign({
      id: 10,
      username: 'fleet.driver',
      roleId: 1,
      permissions: ['fleet:view'],
    });
    adminToken = jwt.sign({
      id: 1,
      username: 'admin',
      roleId: 7,
      permissions: ['user:admin'],
    });
    otherToken = jwt.sign({
      id: 99,
      username: 'other.user',
      roleId: 1,
      permissions: ['fleet:view'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── POST /v1/telemetry/ping ────────────────────────────────────────────────

  it('AT-RT-B-1: 401 when no JWT on POST /telemetry/ping', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/telemetry/ping' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-RT-B-2: 400 when required fields missing on POST /telemetry/ping', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/telemetry/ping',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { unitId: UNIT_ID },
    });
    expect(res.statusCode).toBe(400);
  });

  it('AT-RT-B-3: 400 on invalid coordinates (lat > 90)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/telemetry/ping',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { unitId: UNIT_ID, latitude: 95, longitude: LNG },
    });
    expect(res.statusCode).toBe(400);
  });

  it('AT-RT-B-4: 403 when user does not own the unit (EAL6+ scoping)', async () => {
    // otherToken user (id=99) has no ownership of PIIC-101
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // unit ownership check → empty
    const res = await app.inject({
      method: 'POST',
      url: '/v1/telemetry/ping',
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { unitId: UNIT_ID, latitude: LAT, longitude: LNG },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe('Access denied');
  });

  it('AT-RT-B-5: 200 + ok:true when authorized user pings a valid unit', async () => {
    // Ownership check returns the unit → authorized
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: UNIT_ID }], undefined]) // ownership check
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // upsert

    const res = await app.inject({
      method: 'POST',
      url: '/v1/telemetry/ping',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { unitId: UNIT_ID, latitude: LAT, longitude: LNG, speed: 60, heading: 90 },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it('AT-RT-B-6: admin bypasses ownership check on POST /telemetry/ping', async () => {
    // admin: no ownership query; goes straight to upsert
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/telemetry/ping',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { unitId: UNIT_ID, latitude: LAT, longitude: LNG },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
    // Only 1 db.execute call (the upsert), no ownership check
    expect((db.execute as Mock).mock.calls).toHaveLength(1);
  });

  // ─── GET /v1/telemetry/units ────────────────────────────────────────────────

  it('AT-RT-B-7: 401 when no JWT on GET /telemetry/units', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/telemetry/units' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-RT-B-8: returns empty units array when user has no owner memberships', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // getCallerOwnerIds → empty

    const res = await app.inject({
      method: 'GET',
      url: '/v1/telemetry/units',
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ units: [] });
  });

  it('AT-RT-B-9: returns owner-scoped units with parsed numbers (EAL6+)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
      .mockResolvedValueOnce([
        [
          {
            unit_id: UNIT_ID,
            latitude: '25.6866000',
            longitude: '-100.3161000',
            speed: '60.00',
            heading: '90.00',
            updated_at: '2026-06-23 03:00:00',
          },
        ],
        undefined,
      ]); // scoped SELECT

    const res = await app.inject({
      method: 'GET',
      url: '/v1/telemetry/units',
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.units).toHaveLength(1);
    const unit = body.units[0];
    expect(unit.unitId).toBe(UNIT_ID);
    expect(unit.latitude).toBeCloseTo(LAT, 4);
    expect(unit.longitude).toBeCloseTo(LNG, 4);
    expect(unit.speed).toBe(60);
    expect(unit.heading).toBe(90);
  });

  it('AT-RT-B-10: admin sees all units without owner filter', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          unit_id: 'PIIC-102',
          latitude: '26.0000000',
          longitude: '-99.0000000',
          speed: '0.00',
          heading: '0.00',
          updated_at: '2026-06-23 03:01:00',
        },
      ],
      undefined,
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/telemetry/units',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.units[0].unitId).toBe('PIIC-102');
    // Admin path: only 1 db.execute (no getCallerOwnerIds)
    expect((db.execute as Mock).mock.calls).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FC-10 VIM_SubUniverse_FamiliarScope FaseA — GET /v1/telemetry/family-units
// ─────────────────────────────────────────────────────────────────────────────
/**
 * AT-FC10-A-1: GET /telemetry/family-units → 401 sin JWT
 * AT-FC10-A-2: GET /telemetry/family-units → 403 FAMILIAR_SCOPE_REQUIRED (role_id=4)
 * AT-FC10-A-3: GET /telemetry/family-units → 403 FAMILIAR_SCOPE_REQUIRED (role_id=3)
 * AT-FC10-A-4: GET /telemetry/family-units → 200 units vacío sin membresía
 * AT-FC10-A-5: GET /telemetry/family-units → 200 units con telemetría (Gherkin Scenario 1)
 * AT-FC10-A-6: GET /telemetry/family-units → 200 units sin telemetría retornan null coords
 * AT-FC10-A-7: GET /telemetry/family-units → 200 estructura tiene campo units array
 * AT-FC10-A-8: GET /telemetry/family-units → 403 si rol no es 5 (Gherkin Scenario 2)
 */
describe('FC-10 VIM_SubUniverse_FamiliarScope FaseA — GET /v1/telemetry/family-units', () => {
  const app = buildApp();
  let familiarToken: string;
  let privateOwnerToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    familiarToken = jwt.sign({ id: 20, permissions: [] });
    privateOwnerToken = jwt.sign({ id: 21, permissions: ['fleet:view', 'fleet:scoped'] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AT-FC10-A-1: 401 sin JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/telemetry/family-units' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-FC10-A-2: 403 FAMILIAR_SCOPE_REQUIRED si role_id=4 (Propietario Privado)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ role_id: 4 }], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/telemetry/family-units',
      headers: { authorization: `Bearer ${privateOwnerToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe('FAMILIAR_SCOPE_REQUIRED');
  });

  it('AT-FC10-A-3: 403 FAMILIAR_SCOPE_REQUIRED si role_id=3 (Centro Especializado)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ role_id: 3 }], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/telemetry/family-units',
      headers: { authorization: `Bearer ${privateOwnerToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe('FAMILIAR_SCOPE_REQUIRED');
  });

  it('AT-FC10-A-4: 200 units vacío cuando sin membresía de owner', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ role_id: 5 }], undefined])
      .mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/telemetry/family-units',
      headers: { authorization: `Bearer ${familiarToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).units).toEqual([]);
  });

  it('AT-FC10-A-5: 200 units con telemetría — Gherkin Scenario 1', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ role_id: 5 }], undefined])
      .mockResolvedValueOnce([[{ owner_id: 10 }], undefined])
      .mockResolvedValueOnce([
        [
          {
            unitId: 'FAM-001',
            label: 'Sedán Familiar',
            driverUsername: 'carlos',
            latitude: 25.67,
            longitude: -100.31,
            speed: 0,
            heading: 0,
            lastPing: '2026-06-24T10:00:00Z',
          },
          {
            unitId: 'FAM-002',
            label: 'SUV Familiar',
            driverUsername: null,
            latitude: null,
            longitude: null,
            speed: null,
            heading: null,
            lastPing: null,
          },
        ],
        undefined,
      ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/telemetry/family-units',
      headers: { authorization: `Bearer ${familiarToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.units).toHaveLength(2);
    expect(body.units[0].latitude).toBe(25.67);
  });

  it('AT-FC10-A-6: 200 units sin telemetría retornan null en coordenadas', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ role_id: 5 }], undefined])
      .mockResolvedValueOnce([[{ owner_id: 10 }], undefined])
      .mockResolvedValueOnce([
        [
          {
            unitId: 'FAM-003',
            label: 'Sin GPS',
            driverUsername: null,
            latitude: null,
            longitude: null,
            speed: null,
            heading: null,
            lastPing: null,
          },
        ],
        undefined,
      ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/telemetry/family-units',
      headers: { authorization: `Bearer ${familiarToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).units[0].latitude).toBeNull();
  });

  it('AT-FC10-A-7: 200 respuesta tiene estructura { units: [...] }', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ role_id: 5 }], undefined])
      .mockResolvedValueOnce([[{ owner_id: 10 }], undefined])
      .mockResolvedValueOnce([
        [
          {
            unitId: 'FAM-001',
            label: 'X',
            driverUsername: null,
            latitude: 1,
            longitude: 1,
            speed: 0,
            heading: 0,
            lastPing: null,
          },
        ],
        undefined,
      ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/telemetry/family-units',
      headers: { authorization: `Bearer ${familiarToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('units');
    expect(Array.isArray(body.units)).toBe(true);
  });

  it('AT-FC10-A-8: 403 FAMILIAR_SCOPE_REQUIRED si usuario no encontrado en users — Gherkin Scenario 2', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/telemetry/family-units',
      headers: { authorization: `Bearer ${familiarToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe('FAMILIAR_SCOPE_REQUIRED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FC-10 VIM_SubUniverse_FamiliarScope FaseB — GET /v1/telemetry/heartbeat
// ─────────────────────────────────────────────────────────────────────────────
/**
 * AT-FC10-B-API-1: GET /telemetry/heartbeat → 401 sin JWT
 * AT-FC10-B-API-2: GET /telemetry/heartbeat → 200 { status: "ok", ts } con JWT válido
 * AT-FC10-B-API-3: response.ts es epoch_ms (número entero positivo)
 * AT-FC10-B-API-4: GET /telemetry/heartbeat → 200 con cualquier role (no role-scoped)
 */
describe('FC-10 VIM_SubUniverse_FamiliarScope FaseB — GET /v1/telemetry/heartbeat', () => {
  const app = buildApp();
  let anyUserToken: string;
  let role4Token: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    anyUserToken = jwt.sign({ id: 30, permissions: [] });
    role4Token = jwt.sign({ id: 31, permissions: ['fleet:view', 'fleet:scoped'] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AT-FC10-B-API-1: 401 sin JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/telemetry/heartbeat' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-FC10-B-API-2: 200 { status: "ok", ts } con JWT válido', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/telemetry/heartbeat',
      headers: { authorization: `Bearer ${anyUserToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('ts');
  });

  it('AT-FC10-B-API-3: response.ts es epoch_ms — número entero positivo', async () => {
    const before = Date.now();
    const res = await app.inject({
      method: 'GET',
      url: '/v1/telemetry/heartbeat',
      headers: { authorization: `Bearer ${anyUserToken}` },
    });
    const after = Date.now();
    const body = JSON.parse(res.body);
    expect(typeof body.ts).toBe('number');
    expect(body.ts).toBeGreaterThanOrEqual(before);
    expect(body.ts).toBeLessThanOrEqual(after);
  });

  it('AT-FC10-B-API-4: 200 disponible para cualquier role autenticado (no role-scoped)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/telemetry/heartbeat',
      headers: { authorization: `Bearer ${role4Token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('ok');
  });
});

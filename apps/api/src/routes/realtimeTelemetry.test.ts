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

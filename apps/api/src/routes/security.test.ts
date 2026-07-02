/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * Security Routes — Archon_Security_AuditLog Fase 2
 *
 * SEC-1: 401 sin token → GET /security/audit-log
 * SEC-2: Archon (permissions=['*']) → HTTP 200, sin filtro de owner
 * SEC-3: Usuario scoped → HTTP 200, filtrado por sus owner_ids
 * SEC-4: Filtro ?entity_type aplicado correctamente
 * SEC-5: Filtro ?action aplicado correctamente
 * SEC-6: Error DB → HTTP 500 AUDIT_FETCH_FAIL
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn(),
    query: vi.fn(),
    getConnection: vi.fn(),
  },
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

const MOCK_AUDIT_ROW = {
  uuid: 'test-uuid-001',
  entity_type: 'fleet_unit',
  entity_id: '42',
  action: 'UPDATE',
  reason: 'Odometer updated',
  snapshot_before: null,
  snapshot_after: null,
  created_at: '2026-06-19T01:00:00.000Z',
  owner_id: 5,
  actor_username: 'piic.root',
  actor_full_name: 'PIIC Root',
  universe_label: 'PIIC SA de CV',
};

describe('GET /v1/security/audit-log', () => {
  const app = buildApp();
  let archonToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    archonToken = jwt.sign({ id: 1, username: 'archon', roleId: 0, permissions: ['*'] });
    adminToken = jwt.sign({
      id: 2,
      username: 'piic.root',
      roleId: 1,
      permissions: ['security:audit:view'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SEC-1: 401 sin token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/security/audit-log' });
    expect(res.statusCode).toBe(401);
  });

  it('SEC-2: Archon ve todos los universos sin filtro de owner', async () => {
    // Archon → resolveAuditScope returns null → no membership query
    // execute called twice: COUNT, then data
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ total: 1 }], undefined]) // COUNT
      .mockResolvedValueOnce([[MOCK_AUDIT_ROW], undefined]); // data

    const res = await app.inject({
      method: 'GET',
      url: '/v1/security/audit-log',
      headers: { authorization: `Bearer ${archonToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.meta.total).toBe(1);

    // Verify COUNT SQL does NOT contain owner_id IN filter
    const countCall = vi.mocked(db.execute).mock.calls[0];
    expect(countCall[0]).not.toContain('owner_id IN');
  });

  it('SEC-3: Usuario scoped ve solo sus owner_ids', async () => {
    // scoped user → resolveAuditScope queries membership first
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ owner_id: 5 }], undefined]) // membership lookup
      .mockResolvedValueOnce([[{ total: 1 }], undefined]) // COUNT
      .mockResolvedValueOnce([[MOCK_AUDIT_ROW], undefined]); // data

    const res = await app.inject({
      method: 'GET',
      url: '/v1/security/audit-log',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);

    // Verify COUNT SQL contains owner_id IN filter
    const countCall = vi.mocked(db.execute).mock.calls[1];
    expect(countCall[0]).toContain('owner_id IN');
    expect(countCall[1]).toContain(5);
  });

  it('SEC-4: Filtro ?entity_type incluido en la query', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ total: 1 }], undefined])
      .mockResolvedValueOnce([[MOCK_AUDIT_ROW], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/security/audit-log?entity_type=fleet_unit',
      headers: { authorization: `Bearer ${archonToken}` },
    });

    expect(res.statusCode).toBe(200);
    const countCall = vi.mocked(db.execute).mock.calls[0];
    expect(countCall[0]).toContain('a.entity_type = ?');
    expect(countCall[1]).toContain('fleet_unit');
  });

  it('SEC-5: Filtro ?action incluido en la query', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ total: 0 }], undefined])
      .mockResolvedValueOnce([[], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/security/audit-log?action=DELETE',
      headers: { authorization: `Bearer ${archonToken}` },
    });

    expect(res.statusCode).toBe(200);
    const countCall = vi.mocked(db.execute).mock.calls[0];
    expect(countCall[0]).toContain('a.action = ?');
    expect(countCall[1]).toContain('DELETE');
  });

  it('SEC-6: Error DB → 500 AUDIT_FETCH_FAIL', async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await app.inject({
      method: 'GET',
      url: '/v1/security/audit-log',
      headers: { authorization: `Bearer ${archonToken}` },
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.code).toBe('AUDIT_FETCH_FAIL');
  });

  it('SEC-7: usuario scoped sin owners → retorna lista vacía inmediatamente', async () => {
    // ownerScope.length === 0 → early return (cubre líneas 64-65)
    vi.mocked(db.execute).mockResolvedValueOnce([[], undefined]); // membership → vacío → scope=[]
    const res = await app.inject({
      method: 'GET',
      url: '/v1/security/audit-log',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(0);
    expect(body.meta.total).toBe(0);
    // Solo 1 call: membership lookup. NO COUNT ni DATA queries.
    expect(vi.mocked(db.execute).mock.calls).toHaveLength(1);
  });

  it('SEC-8: Filtro ?date_from incluido en la query', async () => {
    // Cubre líneas 81-83 (date_from branch)
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ total: 0 }], undefined])
      .mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/security/audit-log?date_from=2026-01-01',
      headers: { authorization: `Bearer ${archonToken}` },
    });
    expect(res.statusCode).toBe(200);
    const countCall = vi.mocked(db.execute).mock.calls[0];
    expect(countCall[0]).toContain('a.created_at >= ?');
    expect(countCall[1]).toContain('2026-01-01');
  });

  it('SEC-9: Filtro ?date_to incluido en la query', async () => {
    // Cubre líneas 86-88 (date_to branch)
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ total: 0 }], undefined])
      .mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/security/audit-log?date_to=2026-06-30',
      headers: { authorization: `Bearer ${archonToken}` },
    });
    expect(res.statusCode).toBe(200);
    const countCall = vi.mocked(db.execute).mock.calls[0];
    expect(countCall[0]).toContain('a.created_at <= ?');
    expect(countCall[1]).toContain('2026-06-30 23:59:59');
  });

  it('SEC-10: COUNT retorna vacío → countRows[0]=undefined → total??0 right-side (B94[0])', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[], undefined]) // COUNT → empty → ??0 fires
      .mockResolvedValueOnce([[], undefined]); // data → empty
    const res = await app.inject({
      method: 'GET',
      url: '/v1/security/audit-log',
      headers: { authorization: `Bearer ${archonToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.meta.total).toBe(0);
    expect(body.data).toHaveLength(0);
  });
});

describe('POST /v1/security/panic — FC-4 Panic_Button FaseA', () => {
  const app = buildApp();
  let userToken: string;
  let isolatedToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    userToken = jwt.sign({ id: 10, username: 'driver.a', roleId: 3, permissions: ['fleet:view'] });
    isolatedToken = jwt.sign({
      id: 99,
      username: 'solo.user',
      roleId: 3,
      permissions: ['fleet:view'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AT-P-1: 401 without JWT', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/security/panic' });
    expect(res.statusCode).toBe(401);
  });

  it('AT-P-2: notifies caller only when no universe members exist', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[], undefined]) // membership query → no peers
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // INSERT for caller

    const res = await app.inject({
      method: 'POST',
      url: '/v1/security/panic',
      headers: { authorization: `Bearer ${isolatedToken}` },
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.notifiedCount).toBe(1);
    expect(body.panicUuid).toBeDefined();
  });

  it('AT-P-3: notifies caller + universe members (N inserts)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ user_id: 11 }, { user_id: 12 }], undefined]) // 2 peers
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT caller
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT peer 11
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // INSERT peer 12

    const res = await app.inject({
      method: 'POST',
      url: '/v1/security/panic',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { latitude: 25.686, longitude: -100.316 },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.notifiedCount).toBe(3); // caller + 2 peers
    // INSERT calls: 1 membership query + 3 INSERTs
    expect(vi.mocked(db.execute).mock.calls).toHaveLength(4);
  });

  it('AT-P-4: INSERT uses PANIC_ALERT notification_type', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[], undefined]) // no peers
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // INSERT

    await app.inject({
      method: 'POST',
      url: '/v1/security/panic',
      headers: { authorization: `Bearer ${isolatedToken}` },
      payload: {},
    });

    const insertCall = vi.mocked(db.execute).mock.calls[1];
    expect(insertCall[1]).toContain('PANIC_ALERT');
  });

  it('AT-P-5: scoped to panic initiator universe (membership JOIN query)', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ user_id: 20 }], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

    await app.inject({
      method: 'POST',
      url: '/v1/security/panic',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { unitId: 'PIIC-101' },
    });

    const membershipCall = vi.mocked(db.execute).mock.calls[0];
    expect((membershipCall[0] as string).toLowerCase()).toContain('user_owner_membership');
    expect(membershipCall[1]).toContain(10); // caller id
  });

  it('AT-P-7: sin body → request.body??{} right-side (B136[0]) → latitude/longitude/unitId=undefined', async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[], undefined]) // membership → no peers
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // INSERT caller
    const res = await app.inject({
      method: 'POST',
      url: '/v1/security/panic',
      headers: { authorization: `Bearer ${isolatedToken}` },
      // no payload → request.body = null → null ?? {} uses right-side
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.notifiedCount).toBe(1);
  });
});

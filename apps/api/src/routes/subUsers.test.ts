import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: POST /v1/auth/sub-users (Archon Master F2-F)
 * Feature Contract: Archon_Master_Fase2_Areas_y_SubUsuarios
 * Creates Área (role_id=2) and Familiar (role_id=5) sub-users.
 * Guard: caller must own parentOwnerId.
 */

const mockConnection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([[], undefined]),
  query: vi.fn().mockResolvedValue([[], undefined]),
};

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v) => `enc_${v}`),
    decrypt: vi.fn((v) => (v && typeof v === 'string' ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v) => `hash_${v}`),
  },
}));

vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn(() => Promise.resolve('hashed_pw')),
  verify: vi.fn(() => Promise.resolve(true)),
}));

const PARENT_OWNER_ID = 100;
const AREA_ID = 5;

describe('POST /v1/auth/sub-users', () => {
  const app = buildApp();
  let flotillaToken: string;

  const basePayload = {
    username: 'area.user',
    email: 'area@flotilla.mx',
    password: 'Archon@1234!',
    roleId: 2,
    parentOwnerId: PARENT_OWNER_ID,
    areaId: AREA_ID,
  };

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    flotillaToken = jwt.sign({
      id: 10,
      username: 'flotilla.owner',
      roleId: 1,
      roleName: 'Propietario de Flotilla',
      permissions: ['fleet:scoped', 'fleet:view'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as Mock).mockReset();
    mockConnection.execute.mockReset();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    mockConnection.execute.mockResolvedValue([[], undefined]);
  });

  const auth = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

  it('returns 401 without session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      payload: basePayload,
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for invalid roleId (not 2 or 5)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      headers: auth(flotillaToken),
      payload: { ...basePayload, roleId: 1 },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('SU_VALIDATION');
  });

  it('returns 400 for weak password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      headers: auth(flotillaToken),
      payload: { ...basePayload, password: 'weakpassword' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 403 when caller does not own parentOwnerId', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ owner_id: 999 }], undefined]); // different owner
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      headers: auth(flotillaToken),
      payload: basePayload,
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe('OWNER_MISMATCH');
  });

  it('returns 400 when parent owner does not exist', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ owner_id: PARENT_OWNER_ID }], undefined]) // callerOwnerIds
      .mockResolvedValueOnce([[], undefined]); // owner not found
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      headers: auth(flotillaToken),
      payload: basePayload,
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('OWNER_NOT_FOUND');
  });

  it('returns 400 when roleId=2 but parent is not FLOTILLA', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ owner_id: PARENT_OWNER_ID }], undefined])
      .mockResolvedValueOnce([[{ id: PARENT_OWNER_ID, owner_type: 'PRIVATE' }], undefined]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      headers: auth(flotillaToken),
      payload: { ...basePayload, roleId: 2 },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('ROLE_OWNER_MISMATCH');
  });

  it('returns 400 when roleId=5 but parent is not PRIVATE or CENTER', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ owner_id: PARENT_OWNER_ID }], undefined])
      .mockResolvedValueOnce([[{ id: PARENT_OWNER_ID, owner_type: 'FLOTILLA' }], undefined]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      headers: auth(flotillaToken),
      payload: { ...basePayload, roleId: 5, familiarType: 'PAREJA' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('ROLE_OWNER_MISMATCH');
  });

  it('returns 400 when roleId=2 but areaId is missing', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ owner_id: PARENT_OWNER_ID }], undefined])
      .mockResolvedValueOnce([[{ id: PARENT_OWNER_ID, owner_type: 'FLOTILLA' }], undefined]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      headers: auth(flotillaToken),
      payload: { ...basePayload, areaId: undefined },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('AREA_REQUIRED');
  });

  it('returns 400 when areaId does not belong to parent owner', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ owner_id: PARENT_OWNER_ID }], undefined])
      .mockResolvedValueOnce([[{ id: PARENT_OWNER_ID, owner_type: 'FLOTILLA' }], undefined])
      .mockResolvedValueOnce([[], undefined]); // area not found
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      headers: auth(flotillaToken),
      payload: basePayload,
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('AREA_NOT_FOUND');
  });

  it('returns 400 when roleId=5 and familiarType is missing', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ owner_id: PARENT_OWNER_ID }], undefined])
      .mockResolvedValueOnce([[{ id: PARENT_OWNER_ID, owner_type: 'PRIVATE' }], undefined]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      headers: auth(flotillaToken),
      payload: { ...basePayload, roleId: 5, areaId: undefined },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('FAMILIAR_TYPE_REQUIRED');
  });

  it('returns 409 when username already exists', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ owner_id: PARENT_OWNER_ID }], undefined])
      .mockResolvedValueOnce([[{ id: PARENT_OWNER_ID, owner_type: 'FLOTILLA' }], undefined])
      .mockResolvedValueOnce([[{ id: AREA_ID }], undefined]) // area valid
      .mockResolvedValueOnce([[{ id: 55 }], undefined]); // username exists
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      headers: auth(flotillaToken),
      payload: basePayload,
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error).toBe('SU_USERNAME_EXISTS');
  });

  it('creates an Área sub-user (roleId=2) and inserts membership', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ owner_id: PARENT_OWNER_ID }], undefined]) // callerOwnerIds
      .mockResolvedValueOnce([[{ id: PARENT_OWNER_ID, owner_type: 'FLOTILLA' }], undefined]) // owner type
      .mockResolvedValueOnce([[{ id: AREA_ID }], undefined]) // area valid
      .mockResolvedValueOnce([[], undefined]); // username unique
    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 77 }, undefined]) // INSERT users
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT user_roles
      .mockResolvedValue([{ affectedRows: 1 }, undefined]); // INSERT membership

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      headers: auth(flotillaToken),
      payload: basePayload,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(77);
    expect(body.data.roleId).toBe(2);

    const sqls = mockConnection.execute.mock.calls.map((c) => c[0] as string);
    expect(sqls.some((s) => s.includes('INSERT INTO users'))).toBe(true);
    expect(sqls.some((s) => s.includes('user_owner_membership'))).toBe(true);
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  it('creates a Familiar sub-user (roleId=5) with familiarType', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ owner_id: PARENT_OWNER_ID }], undefined])
      .mockResolvedValueOnce([[{ id: PARENT_OWNER_ID, owner_type: 'PRIVATE' }], undefined])
      .mockResolvedValueOnce([[], undefined]); // username unique
    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 78 }, undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValue([{ affectedRows: 1 }, undefined]);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      headers: auth(flotillaToken),
      payload: { ...basePayload, roleId: 5, areaId: undefined, familiarType: 'HIJO_A' },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.roleId).toBe(5);

    const membershipCall = mockConnection.execute.mock.calls.find((c) =>
      (c[0] as string).includes('user_owner_membership')
    );
    expect(membershipCall?.[1]).toContain('HIJO_A');
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  it('rolls back and returns 500 on transaction failure', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ owner_id: PARENT_OWNER_ID }], undefined])
      .mockResolvedValueOnce([[{ id: PARENT_OWNER_ID, owner_type: 'FLOTILLA' }], undefined])
      .mockResolvedValueOnce([[{ id: AREA_ID }], undefined])
      .mockResolvedValueOnce([[], undefined]);
    mockConnection.execute.mockRejectedValueOnce(new Error('TX_FAIL'));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sub-users',
      headers: auth(flotillaToken),
      payload: basePayload,
    });

    expect(res.statusCode).toBe(500);
    expect(mockConnection.rollback).toHaveBeenCalled();
  });
});

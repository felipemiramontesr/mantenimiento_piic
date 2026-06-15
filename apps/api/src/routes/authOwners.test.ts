import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: User ↔ Fleet-Owner Links (F1-A · A3)
 * Feature Contract: Owner_Scoped_Fleet_Access_External_Client
 * GET/PUT /v1/auth/users/:id/owners under user:admin guard, plus the
 * auto-creation of the FLEET_OWNER catalog row when registering a role-9 user.
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

vi.mock('argon2', () => ({
  default: {
    hash: vi.fn(() => Promise.resolve('hashed_pw')),
    verify: vi.fn(() => Promise.resolve(true)),
  },
}));

const OWNER_AS = 711;
const OWNER_HU = 712;

describe('User Fleet-Owner Links (A3)', () => {
  const app = buildApp();
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    adminToken = jwt.sign({
      id: 1,
      username: 'rrhh',
      roleId: 7,
      roleName: 'Administrador de RRHH',
      permissions: ['user:admin'],
    });
    staffToken = jwt.sign({
      id: 7,
      username: 'staff',
      roleId: 1,
      roleName: 'Operador General',
      permissions: ['fleet:view'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as Mock).mockReset();
    mockConnection.execute.mockReset();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    mockConnection.execute.mockResolvedValue([[], undefined]);
  });

  const authHeader = (token: string): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
  });

  describe('GET /v1/auth/users/:id/owners', () => {
    it('returns 401 without a session', async (): Promise<void> => {
      const response = await app.inject({ method: 'GET', url: '/v1/auth/users/5/owners' });
      expect(response.statusCode).toBe(401);
    });

    it('returns 403 without user:admin', async (): Promise<void> => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/auth/users/5/owners',
        headers: authHeader(staffToken),
      });
      expect(response.statusCode).toBe(403);
    });

    it('returns the linked owners with their catalog labels', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([
        [{ ownerId: OWNER_AS, label: 'Arian Silver de México' }],
        undefined,
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/auth/users/5/owners',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([{ ownerId: OWNER_AS, label: 'Arian Silver de México' }]);

      const { calls } = (db.execute as Mock).mock;
      expect(calls[0][0]).toContain('user_fleet_owners');
      expect(calls[0][1]).toEqual(['5']);
    });

    it('returns 500 on db failure', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));
      const response = await app.inject({
        method: 'GET',
        url: '/v1/auth/users/5/owners',
        headers: authHeader(adminToken),
      });
      expect(response.statusCode).toBe(500);
    });
  });

  describe('PUT /v1/auth/users/:id/owners', () => {
    const validPayload = { ownerIds: [OWNER_AS, OWNER_HU], reason: 'Asignación de propietarios' };

    it('returns 403 without user:admin', async (): Promise<void> => {
      const response = await app.inject({
        method: 'PUT',
        url: '/v1/auth/users/5/owners',
        headers: authHeader(staffToken),
        payload: validPayload,
      });
      expect(response.statusCode).toBe(403);
    });

    it('returns 400 on invalid payload', async (): Promise<void> => {
      const response = await app.inject({
        method: 'PUT',
        url: '/v1/auth/users/5/owners',
        headers: authHeader(adminToken),
        payload: { ownerIds: 'not-an-array', reason: 'x' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('returns 404 when the user does not exist', async (): Promise<void> => {
      mockConnection.execute.mockResolvedValueOnce([[], undefined]); // user lookup → none

      const response = await app.inject({
        method: 'PUT',
        url: '/v1/auth/users/999/owners',
        headers: authHeader(adminToken),
        payload: validPayload,
      });
      expect(response.statusCode).toBe(404);
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('returns 400 when an ownerId is not a FLEET_OWNER catalog row', async (): Promise<void> => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 5 }], undefined]) // user lookup
        .mockResolvedValueOnce([[{ id: OWNER_AS }], undefined]); // catalog check → only 1 of 2

      const response = await app.inject({
        method: 'PUT',
        url: '/v1/auth/users/5/owners',
        headers: authHeader(adminToken),
        payload: validPayload,
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).code).toBe('VALIDATION_ERROR');
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('replaces the link set atomically (delete + bulk insert + audit)', async (): Promise<void> => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 5 }], undefined]) // user lookup
        .mockResolvedValueOnce([[{ id: OWNER_AS }, { id: OWNER_HU }], undefined]) // catalog check
        .mockResolvedValueOnce([[{ owner_id: OWNER_AS }], undefined]) // snapshot before
        .mockResolvedValue([{ affectedRows: 1 }, undefined]); // delete + insert

      const response = await app.inject({
        method: 'PUT',
        url: '/v1/auth/users/5/owners',
        headers: authHeader(adminToken),
        payload: validPayload,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).data.ownerIds).toEqual([OWNER_AS, OWNER_HU]);

      const sqls = mockConnection.execute.mock.calls.map((c) => c[0] as string);
      expect(sqls.some((s) => s.includes('DELETE FROM user_fleet_owners'))).toBe(true);
      expect(sqls.some((s) => s.includes('INSERT INTO user_fleet_owners'))).toBe(true);
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('accepts an empty set (unlink all) without inserting', async (): Promise<void> => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 5 }], undefined]) // user lookup
        .mockResolvedValueOnce([[], undefined]) // snapshot before
        .mockResolvedValue([{ affectedRows: 1 }, undefined]); // delete

      const response = await app.inject({
        method: 'PUT',
        url: '/v1/auth/users/5/owners',
        headers: authHeader(adminToken),
        payload: { ownerIds: [], reason: 'Revocación total' },
      });

      expect(response.statusCode).toBe(200);
      const sqls = mockConnection.execute.mock.calls.map((c) => c[0] as string);
      expect(sqls.some((s) => s.includes('INSERT INTO user_fleet_owners'))).toBe(false);
    });

    it('rolls back and returns 500 on db failure', async (): Promise<void> => {
      mockConnection.execute.mockRejectedValueOnce(new Error('TX_FAIL'));

      const response = await app.inject({
        method: 'PUT',
        url: '/v1/auth/users/5/owners',
        headers: authHeader(adminToken),
        payload: validPayload,
      });
      expect(response.statusCode).toBe(500);
      expect(mockConnection.rollback).toHaveBeenCalled();
    });
  });

  describe('POST /v1/auth/register — roles 1 and 2 auto-link a FLEET_OWNER', () => {
    const clientPayload = {
      username: 'juan.perez',
      email: 'juan@cliente.mx',
      password: 'Archon@1234!',
      roleId: 1,
      fullName: 'Juan Pérez',
    };

    it('creates the catalog row and the link when the owner does not exist', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined]) // username unique check
        .mockResolvedValueOnce([{ insertId: 55 }, undefined]); // user insert
      mockConnection.execute
        .mockResolvedValueOnce([[], undefined]) // owner by label → none
        .mockResolvedValueOnce([[{ nextId: 1051 }], undefined]) // MAX(id)+1
        .mockResolvedValue([{ affectedRows: 1 }, undefined]); // catalog insert + link

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: clientPayload,
      });

      expect(response.statusCode).toBe(201);

      const { calls } = mockConnection.execute.mock;
      const catalogInsert = calls.find((c) =>
        (c[0] as string).includes('INSERT INTO common_catalogs')
      );
      expect(catalogInsert).toBeDefined();
      expect(catalogInsert?.[1]).toEqual([1051, 'OWN_U55', 'Juan Pérez']);

      const linkInsert = calls.find((c) => (c[0] as string).includes('user_fleet_owners'));
      expect(linkInsert?.[1]).toEqual([55, 1051]);
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('reuses the existing catalog row when the owner label already exists', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined]) // username unique check
        .mockResolvedValueOnce([{ insertId: 56 }, undefined]); // user insert
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 880 }], undefined]) // owner by label → exists
        .mockResolvedValue([{ affectedRows: 1 }, undefined]); // link insert

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: clientPayload,
      });

      expect(response.statusCode).toBe(201);

      const sqls = mockConnection.execute.mock.calls.map((c) => c[0] as string);
      expect(sqls.some((s) => s.includes('INSERT INTO common_catalogs'))).toBe(false);
      const linkInsert = mockConnection.execute.mock.calls.find((c) =>
        (c[0] as string).includes('user_fleet_owners')
      );
      expect(linkInsert?.[1]).toEqual([56, 880]);
    });

    it('returns 400 for roleId outside [1,2] — schema rejects non-owner roles', async (): Promise<void> => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { ...clientPayload, username: 'staff.user', roleId: 0 },
      });

      expect(response.statusCode).toBe(400);
      expect(mockConnection.execute).not.toHaveBeenCalled();
    });

    it('returns 500 and rolls back when the owner linking fails', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined]) // username unique check
        .mockResolvedValueOnce([{ insertId: 58 }, undefined]); // user insert
      mockConnection.execute.mockRejectedValueOnce(new Error('LINK_FAIL'));

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: clientPayload,
      });

      expect(response.statusCode).toBe(500);
      expect(mockConnection.rollback).toHaveBeenCalled();
    });
  });
});

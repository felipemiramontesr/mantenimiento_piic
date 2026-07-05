import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, afterEach, Mock } from 'vitest';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import buildApp from '../index';
import db from '../services/db';
import FleetService from '../services/fleetService';

/**
 * 🔱 Archon Integration Test: Nucleus Saturation (v.43.0.0)
 * Absolute Branch/Line/Statement/Function Coverage Strike
 */

const mockConnection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([[], undefined]),
};

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));
vi.mock('@node-rs/argon2', () => ({ hash: vi.fn(), verify: vi.fn() }));
vi.mock('../services/fleetService', () => ({
  default: { getUserOwnerIds: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v) => `enc_${v}`),
    decrypt: vi.fn((v) => (v ? v.replace('enc_', '') : '')),
  },
}));

describe('authIntegration.test', () => {
  const app = buildApp();
  const validCreds = { username: 'admin_test', password: 'password123' };
  let mockToken: string;

  beforeAll(async () => {
    await app.ready();
    mockToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'admin@piic.mx' });
  });

  beforeEach(() => {
    vi.resetAllMocks();
    // Restore default after reset — login now makes 2 extra db.execute calls (user_roles + perms)
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    (argon2Verify as Mock).mockResolvedValue(true);
    (argon2Hash as Mock).mockResolvedValue('hash_value');
  });

  const authHeader = (): Record<string, string> => ({
    Authorization: `Bearer ${mockToken}`,
  });

  it('Path: Successful Login Matrix', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 1,
          username: 'admin_test',
          email: 'enc_a',
          password_hash: 'h',
          role_id: 1,
          role_name: 'Admin',
          profile_picture_url: 'avatar.png',
        },
      ],
      undefined,
    ]);
    const r1 = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: validCreds });
    expect(r1.statusCode).toBe(200);
    expect(JSON.parse(r1.body).user.imageUrl).toContain('/profile-image');

    // Plan Omega: data URI should pass through directly
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 3,
          username: 'omega_test',
          email: 'enc_omega',
          password_hash: 'h',
          role_id: 1,
          role_name: 'Admin',
          profile_picture_url: 'data:image/jpeg;base64,/9j/test',
        },
      ],
      undefined,
    ]);
    const r1b = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: validCreds });
    expect(r1b.statusCode).toBe(200);
    expect(JSON.parse(r1b.body).user.imageUrl).toContain('data:image/jpeg;base64,');

    const email = 'target@piic.mx';
    (db.execute as Mock)
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ id: 2, email: `enc_${email}`, is_active: 1 }], undefined])
      .mockResolvedValueOnce([
        [
          {
            id: 2,
            username: 'u_target',
            email: `enc_${email}`,
            passwordHash: 'h',
            roleId: 2,
            roleName: 'U',
            imageUrl: 'pic.jpg',
          },
        ],
        undefined,
      ])
      // user_roles query (V.124) — empty → falls back to roleId for permission resolution
      .mockResolvedValueOnce([[], undefined])
      // permissions query for non-master role
      .mockResolvedValueOnce([[{ slug: 'fleet:view' }, { slug: 'maint:view' }], undefined]);
    const r2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: email, password: 'p' },
    });
    expect(r2.statusCode).toBe(200);
    expect(JSON.parse(r2.body).user.imageUrl).toContain('/profile-image');
  });

  it('Path: Register & Conflict Sovereign Logic', async () => {
    // roleId: 1 — user INSERT now inside withConnection transaction (Fase 3)
    (db.getConnection as Mock).mockResolvedValue(mockConnection);
    (mockConnection.execute as Mock)
      .mockResolvedValueOnce([{ insertId: 70 }, undefined]) // INSERT users (inside transaction)
      .mockResolvedValueOnce([[], undefined]) // owner label lookup → none
      .mockResolvedValueOnce([[{ nextId: 1051 }], undefined]) // MAX(id)+1
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT common_catalogs
      .mockResolvedValueOnce([[], undefined]) // SELECT handle collision check → no collision
      .mockResolvedValue([{ affectedRows: 1 }, undefined]); // INSERT owners + membership

    (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // username check only
    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'user70',
        email: 'e70@e.com',
        password: 'Archon@1234!',
        roleId: 1,
        profile: { rfc: 'ABC010101000' },
      },
    });
    expect(r1.statusCode).toBe(201);

    (db.execute as Mock).mockResolvedValueOnce([[{ id: 70 }], undefined]);
    const r2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'user70',
        email: 'e70@e.com',
        password: 'Archon@1234!',
        roleId: 1,
        profile: { rfc: 'ABC010101000' },
      },
    });
    expect(r2.statusCode).toBe(409);
  });

  it('Path: Users (Filtered & Unfiltered) & Roles', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ id: 1, email: 'e', role_id: 1 }], undefined]);
    const r1 = await app.inject({ method: 'GET', url: '/v1/auth/users', headers: authHeader() });
    expect(r1.statusCode).toBe(200);

    (db.execute as Mock).mockResolvedValueOnce([[{ id: 2, email: 'e2', role_id: 2 }], undefined]);
    const r1b = await app.inject({
      method: 'GET',
      url: '/v1/auth/users?role=2',
      headers: authHeader(),
    });
    expect(r1b.statusCode).toBe(200);

    (db.execute as Mock).mockResolvedValueOnce([[{ id: 1, name: 'Admin' }], undefined]);
    const r2 = await app.inject({ method: 'GET', url: '/v1/auth/roles', headers: authHeader() });
    expect(r2.statusCode).toBe(200);
  });

  it('Path: PATCH Identity (Active & Inactive)', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 1 }], undefined]) // Snapshot Before 1
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // Update 1
      .mockResolvedValueOnce([[{ id: 1 }], undefined]) // Snapshot After 1
      .mockResolvedValueOnce([[{ id: 1 }], undefined]) // Snapshot Before 2
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // Update 2
      .mockResolvedValueOnce([[{ id: 1 }], undefined]) // Snapshot After 2
      .mockResolvedValueOnce([[{ id: 1 }], undefined]) // Snapshot Before 3
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // Update 3
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // DELETE user_roles 3
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT user_roles 3
      .mockResolvedValueOnce([[{ id: 1 }], undefined]); // Snapshot After 3
    await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      headers: authHeader(),
      payload: { data: { fullName: 'N', is_active: true }, reason: 'Rectification A' },
    });
    await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      headers: authHeader(),
      payload: { data: { is_active: false }, reason: 'Rectification B' },
    });
    const p3 = {
      department: 'D',
      email: 'e@e.com',
      password: 'password123',
      roleId: 2,
      profilePictureUrl: 'p.jpg',
      employeeNumber: 'E1',
      departmentId: 5,
    };
    const r3 = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      headers: authHeader(),
      payload: { data: p3, reason: 'Rectification C' },
    });
    expect(r3.statusCode).toBe(200);
  });

  it('PATCH — roleId=0 (Archon) persists role change and syncs user_roles', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 5 }], undefined]) // Snapshot Before
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // UPDATE users SET role_id=0
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // DELETE user_roles
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT user_roles
      .mockResolvedValueOnce([[{ id: 5, role_id: 0 }], undefined]); // Snapshot After
    const r = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/5',
      headers: authHeader(),
      payload: { data: { roleId: 0 }, reason: 'Revert to Archon role' },
    });
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.payload).success).toBe(true);
  });

  it('Resilience: Catch Block Nucleus (Aggressive Rejection)', async () => {
    (db.execute as Mock).mockImplementation(() => {
      throw new Error('FATAL');
    });
    (db.getConnection as Mock).mockImplementation(() => {
      throw new Error('FATAL_CONN');
    });

    const r1 = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: validCreds });
    const r2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'user80',
        email: 'e@e.com',
        password: 'Archon@1234!',
        roleId: 1,
        profile: { rfc: 'RFC_FATAL' },
      },
    });
    const r3 = await app.inject({
      method: 'GET',
      url: '/v1/auth/users',
      headers: authHeader(),
    });
    const r4 = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      headers: authHeader(),
      payload: { data: { fullName: 'X' }, reason: 'FATAL_REASON' },
    });
    const r5 = await app.inject({ method: 'GET', url: '/v1/auth/roles', headers: authHeader() });

    expect([r1, r2, r3, r4, r5].every((r) => r.statusCode === 500)).toBe(true);
  });

  it('Edge: Validation & Atomic Fallbacks', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 9,
          username: 'GrayMan',
          email: 'e',
          password_hash: 'h',
          role_id: 0,
          is_active: 0,
          employeeNumber: 'E-001',
        },
      ],
    ]);
    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'GrayMan', password: 'p' },
    });
    expect(r1.statusCode).toBe(200);
    const body1 = JSON.parse(r1.body);
    expect(body1.user.is_active).toBe(false);
    expect(body1.user.employeeNumber).toBe('E-001');

    (db.execute as Mock).mockResolvedValueOnce(null);
    await app.inject({ method: 'POST', url: '/v1/auth/login', payload: validCreds });

    await app.inject({ method: 'POST', url: '/v1/auth/login', payload: {} });
    await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { username: 'u' } });
    await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      payload: { data: {}, reason: 'R' },
    });

    (db.execute as Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 3, email: 'corrupted', is_active: 1 }]]);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'any', password: 'p' },
    });

    // Login fail password
    (argon2Verify as Mock).mockResolvedValueOnce(false);
    (db.execute as Mock).mockResolvedValueOnce([
      [{ id: 1, username: 'u', password_hash: 'h', role_id: 2 }],
    ]);
    const rFailPass = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: validCreds,
    });
    expect(rFailPass.statusCode).toBe(401);
    expect(JSON.parse(rFailPass.body)).toEqual({ error: 'L4' });

    // Validation rejection paths
    const rV1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'a', email: 'not-an-email', password: '1' },
    });
    expect(rV1.statusCode).toBe(400);

    const rV2 = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      payload: { data: { email: 'not-an-email' }, reason: 'VALIDATION_FAIL' },
    });
    expect(rV2.statusCode).toBe(400);
  });

  it('Deep: findUserByEmail Resilience Matrix', async () => {
    // 53-54: response is null
    (db.execute as Mock).mockResolvedValueOnce([[]]).mockResolvedValueOnce(null);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'e@e.com', password: 'p' },
    });

    // 57-58: results is null
    (db.execute as Mock).mockResolvedValueOnce([[]]).mockResolvedValueOnce([null]);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'e@e.com', password: 'p' },
    });

    // 70-71: !found
    (db.execute as Mock).mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ email: 'not-me' }]]);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'target@t.com', password: 'p' },
    });

    // 77-78: fullResponse is null
    (db.execute as Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 5, email: 'e@e.com', is_active: 1 }]])
      .mockResolvedValueOnce(null);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'e@e.com', password: 'p' },
    });

    // 81-83: !fullRows[0]
    (db.execute as Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 6, email: 'e@e.com', is_active: 1 }]])
      .mockResolvedValueOnce([[]]);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'e@e.com', password: 'p' },
    });
  });

  // ─── GET /users/:uuid/node ────────────────────────────────────────────────────

  // ─── GET /me ─────────────────────────────────────────────────────────────────

  it('GET /me — 404 when user not found in DB', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).code).toBe('NOT_FOUND');
  });

  it('GET /me — 200 uses user.role_id when user_roles table returns empty', async () => {
    const userRow = {
      id: 1,
      uuid: 'uuid-1',
      username: 'tech02',
      full_name: 'Tecnico 2',
      email: 'enc_t2@piic.mx',
      role_id: 5,
      employee_number: 'E005',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'Tecnico',
      department_name: null,
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow], undefined]) // SELECT user JOIN roles
      .mockResolvedValueOnce([[], undefined]) // SELECT user_roles → empty → fallback to role_id=5
      .mockResolvedValueOnce([[{ slug: 'fleet:view' }], undefined]); // SELECT permissions for role 5

    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.capabilities).toContain('fleet:view');
  });

  it('GET /me — 200 with roleId=0 returns capabilities=[*]', async () => {
    const userRow = {
      id: 1,
      uuid: 'uuid-1',
      username: 'admin',
      full_name: 'Admin User',
      email: 'enc_admin@piic.mx',
      role_id: 0,
      employee_number: 'E000',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'ARCHON',
      department_name: null,
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow], undefined]) // SELECT user JOIN roles
      .mockResolvedValueOnce([[{ role_id: 0 }], undefined]); // SELECT user_roles

    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.capabilities).toEqual(['*']);
  });

  it('GET /me — 200 with non-0 role fetches permissions from DB', async () => {
    const userRow = {
      id: 1,
      uuid: 'uuid-1',
      username: 'tech01',
      full_name: 'Tecnico',
      email: 'enc_tech@piic.mx',
      role_id: 3,
      employee_number: 'E003',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: 2,
      role_name: 'Tecnico',
      department_name: 'Taller',
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow], undefined]) // SELECT user JOIN roles
      .mockResolvedValueOnce([[{ role_id: 3 }], undefined]) // SELECT user_roles
      .mockResolvedValueOnce([[{ slug: 'maint:write' }], undefined]); // SELECT permissions

    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.capabilities).toContain('maint:write');
  });

  it('GET /me — 500 on DB error', async () => {
    (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).code).toBe('INTERNAL_ERROR');
  });

  // ─── GET /users/:uuid/node ────────────────────────────────────────────────────

  it('GET /users/:uuid/node — happy path returns user + permissions + routes', async () => {
    const omniToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'a@a.mx', permissions: ['*'] });
    const uuid = 'fd88fbc8-6060-11f1-8001-30f6ef81858e';
    const userRow = {
      id: 10,
      uuid,
      username: 'graymantest',
      full_name: 'Test User',
      email: 'enc_test@a.mx',
      role_id: 2,
      employee_number: 'E001',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: 1,
      role_name: 'Admin',
      department_name: 'IT',
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow]])
      .mockResolvedValueOnce([[{ slug: 'user:admin', description: 'Manage users' }]])
      .mockResolvedValueOnce([
        [
          {
            uuid: 'r-uuid',
            unit_id: 'ASM-001',
            destination: 'Mina',
            status: 'COMPLETED',
            start_at: null,
            end_at: null,
          },
        ],
      ]);
    const res = await app.inject({
      method: 'GET',
      url: `/v1/auth/users/${uuid}/node`,
      headers: { Authorization: `Bearer ${omniToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      success: boolean;
      data: { user: { username: string } };
    };
    expect(body.success).toBe(true);
    expect(body.data.user.username).toBe('graymantest');
  });

  it('GET /users/:uuid/node — 404 when user not found', async () => {
    const omniToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'a@a.mx', permissions: ['*'] });
    (db.execute as Mock).mockResolvedValueOnce([[]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/nonexistent-uuid/node',
      headers: { Authorization: `Bearer ${omniToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /users/:uuid/node — 403 without user:admin permission', async () => {
    const noPermToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'a@a.mx', permissions: ['fleet:view'] });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/any-uuid/node',
      headers: { Authorization: `Bearer ${noPermToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET /users/:uuid/node — 500 on DB error', async () => {
    const omniToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'a@a.mx', permissions: ['*'] });
    (db.execute as Mock).mockRejectedValueOnce(new Error('DB error'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/any-uuid/node',
      headers: { Authorization: `Bearer ${omniToken}` },
    });
    expect(res.statusCode).toBe(500);
  });

  it('GET /users/:uuid/node — passes through non-encrypted email unchanged (line 530 decrypt)', async () => {
    const omniToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'a@a.mx', permissions: ['*'] });
    const userRow = {
      id: 10,
      uuid: 'uuid-corrupted',
      username: 'user10',
      full_name: 'User Ten',
      email: 'corrupted',
      role_id: 2,
      employee_number: 'E010',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'Admin',
      department_name: null,
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/uuid-corrupted/node',
      headers: { Authorization: `Bearer ${omniToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.user.email).toBe('corrupted');
  });

  // ─── POST /login — access token claims ───────────────────────────────────────

  it('POST /login — access token has exp claim and type=access', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 5,
          username: 'admin_test',
          email: 'enc_a',
          password_hash: 'h',
          role_id: 1,
          role_name: 'Admin',
          profile_picture_url: null,
        },
      ],
      undefined,
    ]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: validCreds,
    });
    expect(res.statusCode).toBe(200);
    const { token } = JSON.parse(res.body);
    const decoded = app.jwt.decode<{ exp: number; type: string }>(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.type).toBe('access');
    expect(typeof decoded!.exp).toBe('number');
  });

  // ─── POST /refresh ────────────────────────────────────────────────────────────

  it('POST /refresh — 401 REFRESH_FAIL when no cookie', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/refresh' });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error).toBe('REFRESH_FAIL');
  });

  it('POST /refresh — 401 INVALID_TOKEN_TYPE when cookie has access token', async () => {
    // Sign a token with type='access' (not 'refresh')
    const wrongToken = app.jwt.sign({ id: 1, type: 'access' });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: wrongToken },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error).toBe('INVALID_TOKEN_TYPE');
  });

  it('POST /refresh — 401 USER_NOT_FOUND when user is inactive/missing', async () => {
    const refreshToken = app.jwt.sign({ id: 99, type: 'refresh' }, { expiresIn: '7d' });
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // user not found
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error).toBe('USER_NOT_FOUND');
  });

  it('POST /refresh — 200 with new access token (Archon role, permissions=[*])', async () => {
    const refreshToken = app.jwt.sign({ id: 1, type: 'refresh' }, { expiresIn: '7d' });
    const userRow = {
      id: 1,
      uuid: 'uuid-1',
      username: 'grayman',
      full_name: 'GrayMan',
      email: 'enc_gm@piic.mx',
      role_id: 0,
      employee_number: 'E000',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'ARCHON',
      department_name: null,
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow], undefined]) // user query
      .mockResolvedValueOnce([[{ role_id: 0 }], undefined]); // user_roles
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
    const decoded = app.jwt.decode<{ type: string; permissions: string[] }>(body.token);
    expect(decoded!.type).toBe('access');
    expect(decoded!.permissions).toEqual(['*']);
  });

  it('POST /refresh — 200 with new access token (non-zero role, fetches permissions)', async () => {
    const refreshToken = app.jwt.sign({ id: 2, type: 'refresh' }, { expiresIn: '7d' });
    const userRow = {
      id: 2,
      uuid: 'uuid-2',
      username: 'operador',
      full_name: 'Operador',
      email: 'enc_op@piic.mx',
      role_id: 3,
      employee_number: 'E003',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'Tecnico',
      department_name: null,
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow], undefined]) // user query
      .mockResolvedValueOnce([[{ role_id: 3 }], undefined]) // user_roles
      .mockResolvedValueOnce([[{ slug: 'maint:view' }], undefined]); // permissions
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    const decoded = app.jwt.decode<{ type: string; permissions: string[] }>(body.token);
    expect(decoded!.type).toBe('access');
    expect(decoded!.permissions).toContain('maint:view');
  });

  it('POST /refresh — 401 REFRESH_FAIL on DB error', async () => {
    const refreshToken = app.jwt.sign({ id: 1, type: 'refresh' }, { expiresIn: '7d' });
    (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error).toBe('REFRESH_FAIL');
  });

  // ─── POST /logout ─────────────────────────────────────────────────────────────

  it('POST /logout — 200 clears refresh_token cookie', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/logout' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).success).toBe(true);
    // Cookie should be cleared (empty value or Set-Cookie with expired date)
    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    const cookieStr = Array.isArray(setCookieHeader)
      ? setCookieHeader.join('; ')
      : String(setCookieHeader);
    expect(cookieStr).toContain('refresh_token');
  });

  // ─── ownerScope branches — scoped user paths ──────────────────────────────

  it('AUTH-NODE-SCOPE-1: GET /users/:uuid/node — scoped token, user in scope → 200 (line 1197 closing })', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 5, email: 'scoped@piic.mx', permissions: ['user:admin', 'fleet:scoped'] });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([10, 20]);
    const userRow = {
      id: 15,
      uuid: 'scope-uuid-1',
      username: 'scoped_user',
      full_name: 'Scoped User',
      email: 'enc_su@a.mx',
      role_id: 2,
      employee_number: 'E015',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'Operator',
      department_name: null,
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow]])
      .mockResolvedValueOnce([[{ owner_id: 10 }]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/scope-uuid-1/node',
      headers: { Authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.user.username).toBe('scoped_user');
  });

  it('AUTH-NODE-SCOPE-2: GET /users/:uuid/node — scoped token, user NOT in scope → 403 (lines 1192-1196)', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 5, email: 'scoped@piic.mx', permissions: ['user:admin', 'fleet:scoped'] });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([10, 20]);
    const userRow = {
      id: 15,
      uuid: 'scope-uuid-2',
      username: 'out_of_scope',
      full_name: 'Out of Scope',
      email: 'enc_oos@a.mx',
      role_id: 2,
      employee_number: 'E016',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'Operator',
      department_name: null,
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow]])
      .mockResolvedValueOnce([[{ owner_id: 99 }]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/scope-uuid-2/node',
      headers: { Authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).code).toBe('FORBIDDEN');
  });

  it('AUTH-PUT-SCOPE-3: PUT /users/:id/owners — scoped, all owners in scope → 200 (line 858)', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({
      id: 5,
      email: 'scoped@piic.mx',
      permissions: ['admin:role:edit', 'fleet:scoped'],
    });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([1, 2]);
    (db.getConnection as Mock).mockResolvedValueOnce(mockConnection);
    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 20 }], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ id: 1 }], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/auth/users/20/owners',
      headers: { Authorization: `Bearer ${scopedToken}` },
      payload: { ownerIds: [1], reason: 'Scope test assignment' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.ownerIds).toEqual([1]);
  });

  it('AUTH-PUT-SCOPE-4: PUT /users/:id/owners — scoped, existing memberships outside scope → 403 (lines 843-848)', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({
      id: 5,
      email: 'scoped@piic.mx',
      permissions: ['admin:role:edit', 'fleet:scoped'],
    });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([1, 2]);
    (db.getConnection as Mock).mockResolvedValueOnce(mockConnection);
    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 20 }], undefined])
      .mockResolvedValueOnce([[{ owner_id: 99 }], undefined]);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/auth/users/20/owners',
      headers: { Authorization: `Bearer ${scopedToken}` },
      payload: { ownerIds: [1], reason: 'Outside scope test' },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).message).toBe('User outside owner scope');
  });

  it('AUTH-PUT-SCOPE-5: PUT /users/:id/owners — scoped, new ownerIds outside scope → 403 (lines 851-857)', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({
      id: 5,
      email: 'scoped@piic.mx',
      permissions: ['admin:role:edit', 'fleet:scoped'],
    });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([1, 2]);
    (db.getConnection as Mock).mockResolvedValueOnce(mockConnection);
    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 20 }], undefined])
      .mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/auth/users/20/owners',
      headers: { Authorization: `Bearer ${scopedToken}` },
      payload: { ownerIds: [3], reason: 'Outside scope assignment' },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).message).toBe('Cannot assign owner outside of scope');
  });

  it('AUTH-GET-OWNERS-SCOPE-1: GET /users/:id/owners — scoped, user in scope → 200 (line 787 closing })', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({
      id: 5,
      email: 'scoped@piic.mx',
      permissions: ['admin:role:edit', 'fleet:scoped'],
    });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([1, 2]);
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ owner_id: 1 }]])
      .mockResolvedValueOnce([
        [{ ownerId: 1, label: 'Owner A', handle: 'oa', suite: null, ownerType: 'CENTRO' }],
      ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/20/owners',
      headers: { Authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).success).toBe(true);
  });

  it('AUTH-GET-OWNERS-SCOPE-2: GET /users/:id/owners — scoped, user NOT in scope → 403 (lines 782-785)', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({
      id: 5,
      email: 'scoped@piic.mx',
      permissions: ['admin:role:edit', 'fleet:scoped'],
    });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([1, 2]);
    (db.execute as Mock).mockResolvedValueOnce([[{ owner_id: 99 }]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/20/owners',
      headers: { Authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).message).toBe('User outside owner scope');
  });

  it('AUTH-GET-USERS-SCOPE-1: GET /users — scoped user with empty owners → 200 data:[] (lines 522-524)', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 5, email: 'scoped@piic.mx', permissions: ['fleet:scoped'] });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users',
      headers: { Authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data).toEqual([]);
  });

  it('AUTH-LOGIN-DECRYPT-CATCH: POST /login — decrypt throws → catch false → L3 (lines 179-181)', async () => {
    const { default: EncryptionService } = await import('../services/encryption');
    vi.mocked(EncryptionService.decrypt).mockImplementationOnce(() => {
      throw new Error('Crypto error');
    });
    (db.execute as Mock)
      .mockResolvedValueOnce([[], undefined]) // WHERE username = ? → no user
      .mockResolvedValueOnce([[{ id: 99, email: 'bad_cipher', username: 'someone' }], undefined]); // findUserByEmail SELECT
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'nonexistent@test.com', password: 'pass123' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error).toBe('L3');
  });
});

// ─── AUTH Branch Coverage Supplement (AUTH-BC) ───────────────────────────────

describe('AUTH — branch coverage supplement (AUTH-BC)', () => {
  const bcApp = buildApp();

  beforeAll(async () => {
    await bcApp.ready();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    (argon2Verify as Mock).mockResolvedValue(true);
    (argon2Hash as Mock).mockResolvedValue('hash_value');
  });

  afterAll(async () => {
    await bcApp.close();
  });

  it('AUTH-BC-1: POST /register roleId=4 no profile → insertOwnerProfile early return (B16)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
    (db.getConnection as Mock).mockResolvedValueOnce(mockConnection);
    (mockConnection.execute as Mock)
      .mockResolvedValueOnce([{ insertId: 80 }, undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ nextId: 900 }], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'privado.bc1',
        email: 'bc1@test.mx',
        password: 'Archon@1234!',
        roleId: 4,
        fullName: 'Sin Perfil',
      },
    });
    expect(res.statusCode).toBe(201);
    const calls = (mockConnection.execute as Mock).mock.calls.map((c) => c[0] as string);
    expect(calls.some((s) => s.includes('owner_profiles'))).toBe(false);
  });

  it('AUTH-BC-2: POST /register roleId=3 profile no especialidades → null param in INSERT (B21)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
    (db.getConnection as Mock).mockResolvedValueOnce(mockConnection);
    (mockConnection.execute as Mock)
      .mockResolvedValueOnce([{ insertId: 81 }, undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ nextId: 901 }], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'centro.bc2',
        email: 'bc2@test.mx',
        password: 'Archon@1234!',
        roleId: 3,
        fullName: 'Taller BC2',
        profile: { rfc: 'ABC010101000', razon_social: 'Taller' },
      },
    });
    expect(res.statusCode).toBe(201);
    const profileCall = (mockConnection.execute as Mock).mock.calls.find((c) =>
      (c[0] as string).includes('owner_profiles')
    );
    expect(profileCall).toBeDefined();
    expect(profileCall![1][4]).toBeNull();
  });

  it('AUTH-BC-3: POST /login resolveSuite non-empty → return suite (B47)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([
        [
          {
            id: 2,
            username: 'admin_test',
            email: 'enc_a',
            password_hash: 'h',
            role_id: 1,
            role_name: 'Admin',
            profile_picture_url: null,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ slug: 'fleet:view' }], undefined])
      .mockResolvedValueOnce([[{ suite: 'ERP' }], undefined]);
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'admin_test', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).user.suite).toBe('ERP');
  });

  it('AUTH-BC-4: POST /login user_roles non-empty → roleIds from table (B80)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([
        [
          {
            id: 4,
            username: 'admin_test',
            email: 'enc_a',
            password_hash: 'h',
            role_id: 1,
            role_name: 'Admin',
            profile_picture_url: null,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[{ role_id: 1 }, { role_id: 2 }], undefined])
      .mockResolvedValueOnce([[{ slug: 'fleet:view' }], undefined]);
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'admin_test', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('AUTH-BC-5: POST /login roleId=3 → ownerType=CENTER (B87)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([
        [
          {
            id: 5,
            username: 'admin_test',
            email: 'enc_a',
            password_hash: 'h',
            role_id: 3,
            role_name: 'Centro',
            profile_picture_url: null,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ slug: 'maint:view' }], undefined]);
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'admin_test', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).user.ownerType).toBe('CENTER');
  });

  it('AUTH-BC-6: POST /login roleId=4 → ownerType=PRIVATE (B88)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([
        [
          {
            id: 6,
            username: 'admin_test',
            email: 'enc_a',
            password_hash: 'h',
            role_id: 4,
            role_name: 'Privado',
            profile_picture_url: null,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ slug: 'fleet:view' }], undefined]);
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'admin_test', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).user.ownerType).toBe('PRIVATE');
  });

  it('AUTH-BC-7: POST /refresh user_roles non-empty → roleIds from table (B102)', async () => {
    const refreshToken = bcApp.jwt.sign({ id: 10, type: 'refresh' }, { expiresIn: '7d' });
    (db.execute as Mock)
      .mockResolvedValueOnce([
        [
          {
            id: 10,
            uuid: 'uuid-10',
            username: 'op',
            full_name: 'Op',
            email: 'enc_op@piic.mx',
            role_id: 1,
            employee_number: 'E010',
            is_active: 1,
            last_login: null,
            created_at: '2026-01-01',
            profile_picture_url: null,
            department_id: null,
            role_name: 'Op',
            department_name: null,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[{ role_id: 1 }, { role_id: 2 }], undefined])
      .mockResolvedValueOnce([[{ slug: 'fleet:view' }], undefined]);
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('AUTH-BC-8: POST /refresh roleId=3 → ownerType=CENTER (B105)', async () => {
    const refreshToken = bcApp.jwt.sign({ id: 11, type: 'refresh' }, { expiresIn: '7d' });
    (db.execute as Mock)
      .mockResolvedValueOnce([
        [
          {
            id: 11,
            uuid: 'uuid-11',
            username: 'centro',
            full_name: 'Centro',
            email: 'enc_c@piic.mx',
            role_id: 3,
            employee_number: null,
            is_active: 1,
            last_login: null,
            created_at: '2026-01-01',
            profile_picture_url: null,
            department_id: null,
            role_name: 'Centro',
            department_name: null,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ slug: 'maint:view' }], undefined]);
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(200);
    const decoded = bcApp.jwt.decode<{ owner_type: string }>(JSON.parse(res.body).token);
    expect(decoded!.owner_type).toBe('CENTER');
  });

  it('AUTH-BC-9: POST /refresh roleId=4 → ownerType=PRIVATE (B108)', async () => {
    const refreshToken = bcApp.jwt.sign({ id: 12, type: 'refresh' }, { expiresIn: '7d' });
    (db.execute as Mock)
      .mockResolvedValueOnce([
        [
          {
            id: 12,
            uuid: 'uuid-12',
            username: 'privado',
            full_name: 'Privado',
            email: 'enc_p@piic.mx',
            role_id: 4,
            employee_number: null,
            is_active: 1,
            last_login: null,
            created_at: '2026-01-01',
            profile_picture_url: null,
            department_id: null,
            role_name: 'Privado',
            department_name: null,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ slug: 'fleet:view' }], undefined]);
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(200);
    const decoded = bcApp.jwt.decode<{ owner_type: string }>(JSON.parse(res.body).token);
    expect(decoded!.owner_type).toBe('PRIVATE');
  });
});

// ─── AUTH-BC Production Mode (B63 + B90 + B113) ─────────────────────────────
describe('AUTH — production mode branch coverage (AUTH-BC-PROD)', () => {
  let prodApp!: ReturnType<typeof buildApp>;
  const origEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    prodApp = buildApp();
    await prodApp.ready();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    (argon2Verify as Mock).mockResolvedValue(true);
    (argon2Hash as Mock).mockResolvedValue('hash_value');
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
  });

  afterAll(async () => {
    process.env.NODE_ENV = origEnv;
    await prodApp.close();
  });

  it('AUTH-BC-10: POST /login production → rate limit max=10 + cookie domain .piic.com.mx (B63+B90)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([
        [
          {
            id: 7,
            username: 'admin_test',
            email: 'enc_a',
            password_hash: 'h',
            role_id: 1,
            role_name: 'Admin',
            profile_picture_url: null,
          },
        ],
        undefined,
      ])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ slug: 'fleet:view' }], undefined]);
    const res = await prodApp.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'admin_test', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    const setCookieRaw = res.headers['set-cookie'];
    const setCookie = Array.isArray(setCookieRaw) ? setCookieRaw.join('; ') : String(setCookieRaw);
    expect(setCookie).toContain('.piic.com.mx');
    // FC 062 F1 (A05) — refresh cookie hardened flags in production
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Strict');
  });

  it('AUTH-BC-11: POST /logout production → clearCookie domain .piic.com.mx (B113)', async () => {
    const res = await prodApp.inject({ method: 'POST', url: '/v1/auth/logout' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
    const setCookieRaw = res.headers['set-cookie'];
    const setCookie = Array.isArray(setCookieRaw) ? setCookieRaw.join('; ') : String(setCookieRaw);
    expect(setCookie).toContain('.piic.com.mx');
  });
});

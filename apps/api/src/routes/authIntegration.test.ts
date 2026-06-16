import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import buildApp from '../index';
import db from '../services/db';

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
      .mockResolvedValue([{ affectedRows: 1 }, undefined]); // catalog + owners + membership

    (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // username check only
    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'user70', email: 'e70@e.com', password: 'Archon@1234!', roleId: 1 },
    });
    expect(r1.statusCode).toBe(201);

    (db.execute as Mock).mockResolvedValueOnce([[{ id: 70 }], undefined]);
    const r2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'user70', email: 'e70@e.com', password: 'Archon@1234!', roleId: 1 },
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
      payload: { username: 'user80', email: 'e@e.com', password: 'Archon@1234!', roleId: 1 },
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
});

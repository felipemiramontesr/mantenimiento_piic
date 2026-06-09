import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import argon2 from 'argon2';
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
vi.mock('argon2', () => ({ default: { verify: vi.fn(), hash: vi.fn() } }));
vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v) => `enc_${v}`),
    decrypt: vi.fn((v) => {
      if (v === 'corrupted') throw new Error('DECRYPT_ERROR');
      return v ? v.replace('enc_', '') : '';
    }),
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
    (argon2.verify as Mock).mockResolvedValue(true);
    (argon2.hash as Mock).mockResolvedValue('hash_value');
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
    (db.execute as Mock)
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([{ insertId: 70 }, undefined]);
    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'user70', email: 'e70@e.com', password: 'password123' },
    });
    expect(r1.statusCode).toBe(201);

    (db.execute as Mock).mockResolvedValueOnce([[{ id: 70 }], undefined]);
    const r2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'user70', email: 'e70@e.com', password: 'password123' },
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
      payload: { username: 'user80', email: 'e@e.com', password: 'password123' },
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
    (argon2.verify as Mock).mockResolvedValueOnce(false);
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
});

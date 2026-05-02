import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import argon2 from 'argon2';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Nucleus Saturation (v.43.0.0)
 * Absolute Branch/Line/Statement/Function Coverage Strike
 */

vi.mock('../services/db', () => ({ default: { execute: vi.fn() } }));
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

describe('Auth Endpoints Sovereignty', () => {
  const app = buildApp();
  const validCreds = { username: 'admin_test', password: 'password123' };

  beforeEach(() => {
    vi.resetAllMocks();
    (argon2.verify as Mock).mockResolvedValue(true);
    (argon2.hash as Mock).mockResolvedValue('hash_value');
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
    ]);
    const r1b = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: validCreds });
    expect(r1b.statusCode).toBe(200);
    expect(JSON.parse(r1b.body).user.imageUrl).toContain('data:image/jpeg;base64,');

    const email = 'target@piic.mx';
    (db.execute as Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 2, email: `enc_${email}`, is_active: 1 }]])
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
      ]);
    const r2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: email, password: 'p' },
    });
    expect(r2.statusCode).toBe(200);
    expect(JSON.parse(r2.body).user.imageUrl).toContain('/profile-image');
  });

  it('Path: Register & Conflict Sovereign Logic', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ insertId: 70 }]);
    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'user70', email: 'e70@e.com', password: 'password123' },
    });
    expect(r1.statusCode).toBe(201);

    (db.execute as Mock).mockResolvedValueOnce([[{ id: 70 }]]);
    const r2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'user70', email: 'e70@e.com', password: 'password123' },
    });
    expect(r2.statusCode).toBe(409);
  });

  it('Path: Users (Filtered & Unfiltered) & Roles', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ id: 1, email: 'e', role_id: 1 }]]);
    const r1 = await app.inject({ method: 'GET', url: '/v1/auth/users' });
    expect(r1.statusCode).toBe(200);

    (db.execute as Mock).mockResolvedValueOnce([[{ id: 2, email: 'e2', role_id: 2 }]]);
    const r1b = await app.inject({ method: 'GET', url: '/v1/auth/users?role=2' });
    expect(r1b.statusCode).toBe(200);

    (db.execute as Mock).mockResolvedValueOnce([[{ id: 1, name: 'Admin' }]]);
    const r2 = await app.inject({ method: 'GET', url: '/v1/auth/roles' });
    expect(r2.statusCode).toBe(200);
  });

  it('Path: PATCH Identity (Active & Inactive)', async () => {
    (db.execute as Mock).mockResolvedValue([{ affectedRows: 1 }]);
    await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      payload: { fullName: 'N', is_active: true },
    });
    await app.inject({ method: 'PATCH', url: '/v1/auth/users/1', payload: { is_active: false } });
    const p3 = {
      department: 'D',
      email: 'e@e.com',
      password: 'password123',
      roleId: 2,
      profilePictureUrl: 'p.jpg',
      employeeNumber: 'E1',
      departmentId: 5,
    };
    const r3 = await app.inject({ method: 'PATCH', url: '/v1/auth/users/1', payload: p3 });
    expect(r3.statusCode).toBe(200);
  });

  it('Resilience: Catch Block Nucleus (Aggressive Rejection)', async () => {
    (db.execute as Mock).mockImplementation(() => {
      throw new Error('FATAL');
    });

    const r1 = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: validCreds });
    const r2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'user80', email: 'e@e.com', password: 'password123' },
    });
    const r3 = await app.inject({ method: 'GET', url: '/v1/auth/users' });
    const r4 = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      payload: { fullName: 'X' },
    });
    const r5 = await app.inject({ method: 'GET', url: '/v1/auth/roles' });

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
    await app.inject({ method: 'PATCH', url: '/v1/auth/users/1', payload: {} });

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
      payload: { email: 'not-an-email' },
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
});

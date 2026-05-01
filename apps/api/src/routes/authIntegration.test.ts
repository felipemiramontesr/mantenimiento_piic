import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import argon2 from 'argon2';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Absolute Sovereign (v.34.0.0)
 * Final Precision Strike for 100.00% Absolute Coverage
 */

vi.mock('../services/db', () => ({ default: { execute: vi.fn() } }));
vi.mock('argon2', () => ({ default: { verify: vi.fn(), hash: vi.fn() } }));
vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v) => `encrypted_${v}`),
    decrypt: vi.fn((v) => (v ? v.replace('encrypted_', '') : '')),
  },
}));

describe('Auth Integration Endpoints', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.resetAllMocks();
    (argon2.verify as Mock).mockResolvedValue(true);
    (argon2.hash as Mock).mockResolvedValue('hash');
  });

  it('Path: Success Snake Case Login', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 1,
          username: 'admin',
          email: 'encrypted_admin',
          password_hash: 'h',
          role_id: 1,
          role_name: 'Admin',
        },
      ],
    ]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'admin', password: 'p' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('Path: Success Email Fallback + Camel Case', async () => {
    const email = 'target@piic.mx';
    (db.execute as Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 2, email: `encrypted_${email}`, is_active: 1 }]])
      .mockResolvedValueOnce([
        [
          {
            id: 2,
            username: 'u2',
            email: `encrypted_${email}`,
            passwordHash: 'h',
            roleId: 2,
            roleName: 'U',
            fullName: 'F',
            imageUrl: 'i',
          },
        ],
      ]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: email, password: 'p' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).user.roleId).toBe(2);
  });

  it('Path: Registration and Conflict', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ insertId: 10 }]);
    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'user10', email: 'e10@e.com', password: 'password123' },
    });
    expect(res1.statusCode).toBe(201);

    (db.execute as Mock).mockResolvedValueOnce([[{ id: 10 }]]);
    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'user10', email: 'e10@e.com', password: 'password123' },
    });
    expect(res2.statusCode).toBe(409);
  });

  it('Path: User Authority List', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        { id: 1, email: 'e', role_id: 1 },
        { id: 2, email: 'e2', roleId: 2 },
      ],
    ]);
    const res = await app.inject({ method: 'GET', url: '/v1/auth/users' });
    expect(res.statusCode).toBe(200);
  });

  it('Resilience: Database Failure Identifiers', async () => {
    (db.execute as Mock).mockRejectedValue(new Error('FAIL'));

    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'u', password: 'p' },
    });
    expect(r1.statusCode).toBe(500);

    const r2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'user11', email: 'e@e.com', password: 'password123' },
    });
    expect(r2.statusCode).toBe(500);

    const r3 = await app.inject({ method: 'GET', url: '/v1/auth/users' });
    expect(r3.statusCode).toBe(500);

    const r4 = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      payload: { fullName: 'X' },
    });
    expect(r4.statusCode).toBe(500);

    const r5 = await app.inject({ method: 'GET', url: '/v1/auth/roles' });
    expect(r5.statusCode).toBe(500);
  });

  it('Path: findUserByEmail Resilience', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]).mockResolvedValueOnce(null);
    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'u', password: 'p' },
    });
    expect(r1.statusCode).toBe(401);

    (db.execute as Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 3, email: 'encrypted_e', is_active: 1 }]])
      .mockResolvedValueOnce(null);
    const r2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'e', password: 'p' },
    });
    expect(r2.statusCode).toBe(401);
  });

  it('Path: Validation and Sovereign GrayMan', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ id: 9, username: 'GrayMan', email: 'e', password_hash: 'h', role_id: 0 }],
    ]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'GrayMan', password: 'p' },
    });
    expect(res.statusCode).toBe(200);

    const fail = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: {} });
    expect(fail.statusCode).toBe(400);
  });
});

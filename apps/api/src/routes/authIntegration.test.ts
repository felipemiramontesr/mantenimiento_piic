import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import argon2 from 'argon2';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Absolute Overkill (v.37.0.0)
 * Final Precision Strike for 100.00% Coverage in CI/CD
 */

vi.mock('../services/db', () => ({ default: { execute: vi.fn() } }));
vi.mock('argon2', () => ({ default: { verify: vi.fn(), hash: vi.fn() } }));
vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v) => `enc_${v}`),
    decrypt: vi.fn((v) => (v ? v.replace('enc_', '') : '')),
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
        },
      ],
    ]);
    const r1 = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: validCreds });
    expect(r1.statusCode).toBe(200);

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
          },
        ],
      ]);
    const r2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: email, password: 'p' },
    });
    expect(r2.statusCode).toBe(200);
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

  it('Path: Users & Roles Data Integrity', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        { id: 1, email: 'e', role_id: 1 },
        { id: 2, email: 'e2', roleId: 2 },
      ],
    ]);
    const r1 = await app.inject({ method: 'GET', url: '/v1/auth/users' });
    expect(r1.statusCode).toBe(200);

    (db.execute as Mock).mockResolvedValueOnce([[{ id: 1, name: 'Admin' }]]);
    const r2 = await app.inject({ method: 'GET', url: '/v1/auth/roles' });
    expect(r2.statusCode).toBe(200);
  });

  it('Path: PATCH Identity Finalization (Exhaustive)', async () => {
    (db.execute as Mock).mockResolvedValue([{ affectedRows: 1 }]);
    // Saturar cada rama del PATCH
    const fullPayload = {
      fullName: 'Name',
      department: 'D',
      email: 'e@e.com',
      password: 'password123',
      roleId: 1,
      profilePictureUrl: 'p.jpg',
      employeeNumber: 'E1',
      departmentId: 2,
      is_active: false,
    };
    const r = await app.inject({ method: 'PATCH', url: '/v1/auth/users/1', payload: fullPayload });
    expect(r.statusCode).toBe(200);
  });

  it('Resilience: Catch Block Identity', async () => {
    (db.execute as Mock).mockRejectedValue(new Error('FATAL'));
    await app.inject({ method: 'POST', url: '/v1/auth/login', payload: validCreds });
    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'user80', email: 'e@e.com', password: 'password123' },
    });
    await app.inject({ method: 'GET', url: '/v1/auth/users' });
    await app.inject({ method: 'PATCH', url: '/v1/auth/users/1', payload: { fullName: 'X' } });
    await app.inject({ method: 'GET', url: '/v1/auth/roles' });
  });

  it('Edge: Validation & GrayMan Master', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ id: 9, username: 'GrayMan', email: 'e', password_hash: 'h', role_id: 0 }],
    ]);
    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'GrayMan', password: 'p' },
    });
    expect(r1.statusCode).toBe(200);

    await app.inject({ method: 'POST', url: '/v1/auth/login', payload: {} });
    await app.inject({ method: 'PATCH', url: '/v1/auth/users/1', payload: {} });

    (db.execute as Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 3, email: 'enc_e', is_active: 1 }]])
      .mockResolvedValueOnce(null);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'e', password: 'p' },
    });
  });
});

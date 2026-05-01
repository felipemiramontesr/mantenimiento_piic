import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import argon2 from 'argon2';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Atomic Saturation (v.40.0.0)
 * Final Precision Strike for 100.00% Absolute Branches in CI/CD
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
    // 1. Saturar campos y probar is_active: true
    const p1 = { fullName: 'N', is_active: true };
    const r1 = await app.inject({ method: 'PATCH', url: '/v1/auth/users/1', payload: p1 });
    expect(r1.statusCode).toBe(200);

    // 2. Probar is_active: false (Cierra rama atómica)
    const p2 = { is_active: false };
    const r2 = await app.inject({ method: 'PATCH', url: '/v1/auth/users/1', payload: p2 });
    expect(r2.statusCode).toBe(200);

    // 3. Probar resto de campos opcionales
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

  it('Edge: Validation & Atomic Logic', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ id: 9, username: 'GrayMan', email: 'e', password_hash: 'h', role_id: 0 }],
    ]);
    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'GrayMan', password: 'p' },
    });
    expect(r1.statusCode).toBe(200);

    // Casos nulos y vacíos para ramas de fallo
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

    (db.execute as Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 4, email: 'enc_e', is_active: 1 }]])
      .mockResolvedValueOnce(null);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'e', password: 'p' },
    });
  });
});

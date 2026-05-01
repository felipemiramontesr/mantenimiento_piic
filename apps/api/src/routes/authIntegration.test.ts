import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import argon2 from 'argon2';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Total Restoration (v.35.0.0)
 * Goal: Absolute 100.00% Coverage in CI/CD
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

  beforeEach(() => {
    vi.resetAllMocks();
    (argon2.verify as Mock).mockResolvedValue(true);
    (argon2.hash as Mock).mockResolvedValue('hash');
  });

  it('Verify: Login Path (Standard & Fallback)', async () => {
    // Éxito Directo (Snake Case)
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 1,
          username: 'admin',
          email: 'enc_a',
          password_hash: 'h',
          role_id: 1,
          role_name: 'Admin',
        },
      ],
    ]);
    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'admin', password: 'p' },
    });
    expect(r1.statusCode).toBe(200);

    // Éxito por Email (Camel Case + Fallback)
    const email = 'target@piic.mx';
    (db.execute as Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 2, email: `enc_${email}`, is_active: 1 }]])
      .mockResolvedValueOnce([
        [
          {
            id: 2,
            username: 'u2',
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

  it('Verify: Register & Conflict Logic', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ insertId: 7 }]);
    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'u7', email: 'e7@e.com', password: 'password123' },
    });
    expect(r1.statusCode).toBe(201);

    (db.execute as Mock).mockResolvedValueOnce([[{ id: 7 }]]);
    const r2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'u7', email: 'e7@e.com', password: 'password123' },
    });
    expect(r2.statusCode).toBe(409);
  });

  it('Verify: Users & Roles Success Paths', async () => {
    // Listado de Usuarios
    (db.execute as Mock).mockResolvedValueOnce([
      [
        { id: 1, email: 'e', role_id: 1 },
        { id: 2, email: 'e2', roleId: 2 },
      ],
    ]);
    const r1 = await app.inject({ method: 'GET', url: '/v1/auth/users' });
    expect(r1.statusCode).toBe(200);

    // Listado de Roles
    (db.execute as Mock).mockResolvedValueOnce([[{ id: 1, name: 'Admin' }]]);
    const r2 = await app.inject({ method: 'GET', url: '/v1/auth/roles' });
    expect(r2.statusCode).toBe(200);
    expect(JSON.parse(r2.body).length).toBe(1);
  });

  it('Verify: PATCH Identity Updates', async () => {
    (db.execute as Mock).mockResolvedValue([{ affectedRows: 1 }]);
    const r = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      payload: { fullName: 'Nuevo Nombre', is_active: true },
    });
    expect(r.statusCode).toBe(200);
  });

  it('Verify: System Failures (Catch Blocks)', async () => {
    (db.execute as Mock).mockRejectedValue(new Error('SYSTEM_FAILURE'));

    const endpoints = [
      { method: 'POST', url: '/v1/auth/login', payload: { username: 'u', password: 'p' } },
      {
        method: 'POST',
        url: '/v1/auth/register',
        payload: { username: 'u8', email: 'e@e.com', password: 'password123' },
      },
      { method: 'GET', url: '/v1/auth/users' },
      { method: 'PATCH', url: '/v1/auth/users/1', payload: { fullName: 'X' } },
      { method: 'GET', url: '/v1/auth/roles' },
    ];

    await Promise.all(
      endpoints.map(async (ep) => {
        const res = await app.inject(ep);
        expect(res.statusCode).toBe(500);
      })
    );
  });

  it('Verify: Edge Cases & Validation', async () => {
    // Búsqueda por email fallida en detalle
    (db.execute as Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 3, email: 'enc_e', is_active: 1 }]])
      .mockResolvedValueOnce(null);
    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'e', password: 'p' },
    });
    expect(r1.statusCode).toBe(401);

    // Payload vacío
    const r2 = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: {} });
    expect(r2.statusCode).toBe(400);

    // GrayMan Master
    (db.execute as Mock).mockResolvedValueOnce([
      [{ id: 9, username: 'GrayMan', email: 'e', password_hash: 'h', role_id: 0 }],
    ]);
    const r3 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'GrayMan', password: 'p' },
    });
    expect(r3.statusCode).toBe(200);
  });
});

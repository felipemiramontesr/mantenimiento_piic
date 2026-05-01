import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import argon2 from 'argon2';
import buildApp from '../index';
import db from '../services/db';
import EncryptionService from '../services/encryption';

/**
 * 🔱 Archon Integration Test: Auth Routes
 * Implementation: 100% Path Coverage (Pillar 2 - v.17.0.0)
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

vi.mock('argon2', () => ({
  default: {
    verify: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((val) => `encrypted_${val}`),
    decrypt: vi.fn((val) => val.replace('encrypted_', '')),
  },
}));

describe('Auth Integration Endpoints', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /v1/login', () => {
    const validCredentials = {
      username: 'admin',
      password: 'correct_password',
    };

    it('should successfully login and return a JWT token', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 1,
            username: 'admin',
            email: EncryptionService.encrypt('admin@piic.mx'),
            passwordHash: 'hashed_password',
            roleId: 0, // Master (Archon)
            roleName: 'Master (Archon)',
          },
        ],
      ]);

      // 1.1 Mock Permissions fetch (Second call in auth.ts)
      (db.execute as Mock).mockResolvedValueOnce([[{ slug: 'fleet:view' }]]);

      // 1.2 Mock ALL Permissions fetch (Third call for Omega Bypass in auth.ts)
      (db.execute as Mock).mockResolvedValueOnce([
        [{ slug: 'fleet:view' }, { slug: 'fleet:write' }, { slug: 'user:admin' }],
      ]);

      // 2. Mock Argon2 verification
      (argon2.verify as Mock).mockResolvedValueOnce(true);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: validCredentials,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('success');
      expect(body.token).toBeDefined();
      expect(body.user.email).toBe('admin@piic.mx');
      expect(body.user.imageUrl).toBeNull();
    });

    it('should include profile image URL if it exists in DB', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 1,
            username: 'admin',
            email: EncryptionService.encrypt('admin@piic.mx'),
            passwordHash: 'hashed_password',
            roleId: 1,
            roleName: 'Director de Flotilla',
            profile_picture_url: 'avatar.jpg',
          },
        ],
      ]);
      (db.execute as Mock).mockResolvedValueOnce([[{ slug: 'fleet:view' }]]);
      (argon2.verify as Mock).mockResolvedValueOnce(true);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: validCredentials,
      });

      const body = JSON.parse(response.body);
      expect(body.user.imageUrl).toBe('/v1/users/1/profile-image');
    });

    it('should return 401 if user does not exist', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: validCredentials,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 if password is incorrect', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 1,
            username: 'admin',
            email: 'encrypted',
            passwordHash: 'hashed',
            roleId: 1,
            roleName: 'Director de Flotilla',
          },
        ],
      ]);
      (argon2.verify as Mock).mockResolvedValueOnce(false);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { username: 'admin', password: 'wrong_password' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid payload schema', async (): Promise<void> => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { user: 'missing_fields' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle internal server errors (argon2 fail)', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 1,
            username: 'admin',
            email: 'encrypted',
            passwordHash: 'hashed',
            roleId: 1,
            roleName: 'Director de Flotilla',
          },
        ],
      ]);
      (argon2.verify as Mock).mockRejectedValueOnce(new Error('ARGON_CRASH'));

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: validCredentials,
      });

      expect(response.statusCode).toBe(500);
    });

    it('should return 401 if DB returns invalid user schema', async (): Promise<void> => {
      // Return something that doesn't match userDbSchema (e.g. string for id)
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 'INVALID' }]]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: validCredentials,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /v1/auth/register', () => {
    const newUser = {
      username: 'new_operator',
      email: 'operator@piic.mx',
      password: 'secure_password123',
      roleId: 2,
    };

    it('should successfully register a new user', async (): Promise<void> => {
      (argon2.hash as Mock).mockResolvedValueOnce('hashed_password');
      (db.execute as Mock)
        .mockResolvedValueOnce([[]]) // 1. Identity check (not exists)
        .mockResolvedValueOnce([{ insertId: 2 }]); // 2. Persistence

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: newUser,
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body).message).toContain('exitosamente');
    });

    it('should return 409 if username is already taken', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]); // Identity check (exists)

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: newUser,
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body).error).toContain('ya está registrado');
    });

    it('should return 400 for password too short', async (): Promise<void> => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: { ...newUser, password: 'short' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle critical failure during registration', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('QUERY_FAIL'));

      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: newUser,
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('GET /v1/auth/users', () => {
    it('should return a list of active personnel', async (): Promise<void> => {
      const mockUsers = [
        {
          id: 1,
          username: 'admin',
          email: EncryptionService.encrypt('a@piic.mx'),
          roleId: 1,
          roleName: 'ADMIN',
        },
        {
          id: 2,
          username: 'tech',
          email: EncryptionService.encrypt('t@piic.mx'),
          roleId: 3,
          roleName: 'TÉCNICO',
          profile_picture_url: 'profile_user_2.jpg',
        },
      ];
      (db.execute as Mock).mockResolvedValueOnce([mockUsers]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/auth/users',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.count).toBe(2);
      expect(data.data[0].email).toBe('a@piic.mx');
    });

    it('should filter personnel by roleId', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/auth/users',
        query: { role: '3' },
      });

      expect(response.statusCode).toBe(200);
      // Verify query includes the filter (implied by execution)
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('u.role_id = ?'), [3]);
    });

    it('should handle failure when listing personnel', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_DOWN'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/auth/users',
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('PATCH /v1/auth/users/:id', () => {
    const updateData = {
      fullName: 'Ana Karen Actualizada',
      department: 'Logística',
      employeeNumber: 'EMP-999',
    };

    it('should successfully update personnel identity', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/1',
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).message).toContain('exitosamente');
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET'), [
        'Ana Karen Actualizada',
        'Logística',
        'EMP-999',
        '1',
      ]);
    });

    it('should securely update password with argon2 hashing', async (): Promise<void> => {
      (argon2.hash as Mock).mockResolvedValueOnce('new_hashed_password');
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/1',
        payload: { password: 'new_secure_password' },
      });

      expect(response.statusCode).toBe(200);
      expect(argon2.hash).toHaveBeenCalledWith('new_secure_password');
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('password_hash = ?'), [
        'new_hashed_password',
        '1',
      ]);
    });

    it('should encrypt email updates for sovereign privacy', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/1',
        payload: { email: 'new@piic.mx' },
      });

      expect(response.statusCode).toBe(200);
      const encrypted = EncryptionService.encrypt('new@piic.mx');
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('email = ?'), [
        encrypted,
        '1',
      ]);
    });

    it('should update is_active status correctly', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/1',
        payload: { is_active: false },
      });

      expect(response.statusCode).toBe(200);
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('is_active = ?'), [0, '1']);
    });

    it('should reactivate personnel account correctly', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/1',
        payload: { is_active: true },
      });

      expect(response.statusCode).toBe(200);
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('is_active = ?'), [1, '1']);
    });

    it('should update roleId and image_url for industrial profile completeness', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/1',
        payload: { roleId: 3, profilePictureUrl: 'https://cdn.piic.mx/profiles/ana.jpg' },
      });

      expect(response.statusCode).toBe(200);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('role_id = ?'),
        expect.arrayContaining([3, 'https://cdn.piic.mx/profiles/ana.jpg', '1'])
      );
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('profile_picture_url = ?'),
        expect.anything()
      );
    });

    it('should return 400 for invalid update schema (bad email)', async (): Promise<void> => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/1',
        payload: { email: 'not-an-email' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if no fields are provided for update', async (): Promise<void> => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/1',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('campos que actualizar');
    });

    it('should handle critical failure during identity update', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('CRITICAL_DB_FAIL'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/1',
        payload: { fullName: 'Failure Test' },
      });

      expect(response.statusCode).toBe(500);
    });
  });
});

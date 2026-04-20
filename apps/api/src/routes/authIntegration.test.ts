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
  },
}));

describe('Auth Integration Endpoints', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /v1/login', () => {
    const validCredentials = {
      username: 'admin',
      password: 'correct_password',
    };

    it('should successfully login and return a JWT token', async (): Promise<void> => {
      // 1. Mock DB user fetch
      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 1,
            username: 'admin',
            email: EncryptionService.encrypt('admin@piic.mx'),
            passwordHash: 'hashed_password',
            roleId: 1,
          },
        ],
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
});

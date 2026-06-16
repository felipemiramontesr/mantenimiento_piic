import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Catalog Routes
 * Implementation: 100% Path & Branch Coverage (Pillar 2 - v.18.0.0)
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

describe('Catalogs Integration Endpoints', () => {
  const app = buildApp();
  let token: string;

  beforeAll(async (): Promise<void> => {
    await app.ready();
    token = app.jwt.sign({
      id: 1,
      username: 'admin',
      roleId: 1,
      roleName: 'Director',
      permissions: ['*'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Security — A01:2021 Broken Access Control', () => {
    it('should reject unauthenticated requests with 401', async (): Promise<void> => {
      const response = await app.inject({ method: 'GET', url: '/v1/catalogs/ASSET_TYPE' });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /v1/catalogs/:category', () => {
    it('should fetch catalog items by category successfully', async (): Promise<void> => {
      const mockData = [{ id: 1, code: 'V_TRUCK', label: 'Truck', numericValue: null, unit: null }];
      (db.execute as Mock).mockResolvedValueOnce([mockData]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/ASSET_TYPE',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockData);
    });

    it('should filter by parentId if provided', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/BRAND?parentId=10',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('AND parent_id = ?'), [
        'BRAND',
        '10',
      ]);
    });

    it('should handle database errors', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('FAIL'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/ASSET_TYPE',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toBe('Failed to fetch catalog data');
    });
  });

  describe('GET /v1/catalogs/item/:code', () => {
    it('should fetch a specific item by code', async (): Promise<void> => {
      const mockItem = { id: 100, code: 'U_5K', label: '5k KM' };
      (db.execute as Mock).mockResolvedValueOnce([[mockItem]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/item/U_5K',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockItem);
    });

    it('should return 404 if the item is not found', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/item/MISSING',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toBe('Catalog item not found');
    });

    it('should handle database errors on item lookup', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('FAIL'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/item/U_5K',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toBe('Failed to fetch item');
    });
  });

  // ── Scenario 7 — GET /v1/catalogs/centers ────────────────────────────────

  describe('GET /v1/catalogs/centers — Scenario 7', () => {
    it('returns list of CENTER owners for authenticated user', async (): Promise<void> => {
      const mockCenters = [
        { id: 10, label: 'Centro A' },
        { id: 11, label: 'Centro B' },
      ];
      (db.execute as Mock).mockResolvedValueOnce([mockCenters]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/centers',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockCenters);
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining("owner_type = 'CENTER'"));
    });

    it('returns 401 for unauthenticated request to /centers', async (): Promise<void> => {
      const response = await app.inject({ method: 'GET', url: '/v1/catalogs/centers' });
      expect(response.statusCode).toBe(401);
    });

    it('returns 500 on database error for /centers', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/centers',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).code).toBe('INTERNAL_ERROR');
    });
  });
});

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

  // ── Suite Isolation — FC-2 Subfase 2C (EAL6+ multi-tenant) ─────────────

  describe('Suite Isolation — FC-2 Subfase 2C', () => {
    let vimToken: string;
    let erpToken: string;

    beforeAll(() => {
      vimToken = app.jwt.sign({
        id: 2,
        username: 'vim_user',
        roleId: 4,
        roleName: 'Owner',
        permissions: ['fleet:view'],
        suite: 'VIM',
      });
      erpToken = app.jwt.sign({
        id: 3,
        username: 'erp_user',
        roleId: 2,
        roleName: 'Fleet',
        permissions: ['fleet:view'],
        suite: 'ERP',
      });
    });

    // SC2C-1: VIM accede a categoría exclusiva VIM
    it('SC2C-1: VIM user can access SPECIALTY (VIM-exclusive) — 200', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/SPECIALTY',
        headers: { authorization: `Bearer ${vimToken}` },
      });
      expect(response.statusCode).toBe(200);
    });

    // SC2C-2: ERP bloqueado de categoría exclusiva VIM
    it('SC2C-2: ERP user is blocked from SPECIALTY — 403 FORBIDDEN', async (): Promise<void> => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/SPECIALTY',
        headers: { authorization: `Bearer ${erpToken}` },
      });
      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.code).toBe('FORBIDDEN');
    });

    // SC2C-3: ERP accede a categoría exclusiva ERP
    it('SC2C-3: ERP user can access FLEET_AREA (ERP-exclusive) — 200', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/FLEET_AREA',
        headers: { authorization: `Bearer ${erpToken}` },
      });
      expect(response.statusCode).toBe(200);
    });

    // SC2C-4: VIM bloqueado de categoría exclusiva ERP
    it('SC2C-4: VIM user is blocked from FLEET_AREA — 403 FORBIDDEN', async (): Promise<void> => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/FLEET_AREA',
        headers: { authorization: `Bearer ${vimToken}` },
      });
      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.code).toBe('FORBIDDEN');
    });

    // SC2C-5: categoría compartida accesible por ambas suites
    it('SC2C-5: ASSET_TYPE accessible by both VIM and ERP suites', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);
      const res1 = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/ASSET_TYPE',
        headers: { authorization: `Bearer ${vimToken}` },
      });
      (db.execute as Mock).mockResolvedValueOnce([[]]);
      const res2 = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/ASSET_TYPE',
        headers: { authorization: `Bearer ${erpToken}` },
      });
      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
    });

    // SC2C-6: admin sin suite no es restringido (bypass)
    it('SC2C-6: admin without suite can access SPECIALTY and FLEET_AREA', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);
      const res1 = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/SPECIALTY',
        headers: { authorization: `Bearer ${token}` },
      });
      (db.execute as Mock).mockResolvedValueOnce([[]]);
      const res2 = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/FLEET_AREA',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
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

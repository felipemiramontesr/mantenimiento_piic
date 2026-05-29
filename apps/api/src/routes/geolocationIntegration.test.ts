import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Geolocation Routes (English Schema)
 * Implementation: 100% Path & Branch Coverage
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

describe('Geolocation Integration Endpoints', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/geolocation/states', () => {
    it('should fetch all states successfully', async (): Promise<void> => {
      const mockStates = [
        { id: 1, name: 'Aguascalientes' },
        { id: 2, name: 'Jalisco' },
      ];
      (db.execute as Mock).mockResolvedValueOnce([mockStates]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/states',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockStates);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name FROM states')
      );
    });

    it('should handle database errors on states fetch', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/states',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).success).toBe(false);
      expect(JSON.parse(response.body).code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /v1/geolocation/states/:stateId/municipalities', () => {
    it('should fetch municipalities by state successfully', async (): Promise<void> => {
      const mockMun = [{ id: 10, name: 'Zapopan' }];
      (db.execute as Mock).mockResolvedValueOnce([mockMun]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/states/2/municipalities',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockMun);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name FROM municipalities WHERE state_id = ?'),
        ['2']
      );
    });

    it('should search municipalities with search query successfully', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/states/2/municipalities?search=Zapo',
      });

      expect(response.statusCode).toBe(200);
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('AND name LIKE ?'), [
        '2',
        '%Zapo%',
      ]);
    });

    it('should handle database errors on municipalities fetch', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/states/2/municipalities',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).success).toBe(false);
      expect(JSON.parse(response.body).code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /v1/geolocation/municipalities/:municipalityId/neighborhoods', () => {
    it('should fetch neighborhoods by municipality successfully', async (): Promise<void> => {
      const mockCol = [{ id: 100, name: 'Centro', postalCode: 44100, city: 'Guadalajara' }];
      (db.execute as Mock).mockResolvedValueOnce([mockCol]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/municipalities/10/neighborhoods',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockCol);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT id, name, postal_code as postalCode, city FROM neighborhoods WHERE municipality_id = ?'
        ),
        ['10']
      );
    });

    it('should search neighborhoods with search query by name or zip code', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/municipalities/10/neighborhoods?q=441',
      });

      expect(response.statusCode).toBe(200);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('AND (name LIKE ? OR postal_code LIKE ?)'),
        ['10', '%441%', '%441%']
      );
    });

    it('should handle database errors on neighborhoods fetch', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/municipalities/10/neighborhoods',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).success).toBe(false);
      expect(JSON.parse(response.body).code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /v1/geolocation/neighborhoods/:neighborhoodId', () => {
    it('should fetch neighborhood details by ID successfully', async (): Promise<void> => {
      const mockDetail = {
        id: 100,
        name: 'Centro',
        postalCode: 44100,
        municipalityId: 10,
        stateId: 2,
      };
      (db.execute as Mock).mockResolvedValueOnce([[mockDetail]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/neighborhoods/100',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockDetail);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.id, c.name, c.postal_code as postalCode'),
        ['100']
      );
    });

    it('should return 404 when neighborhood details are not found', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/neighborhoods/999',
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).success).toBe(false);
      expect(JSON.parse(response.body).code).toBe('NOT_FOUND');
    });

    it('should handle database errors on details fetch', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/neighborhoods/100',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).success).toBe(false);
      expect(JSON.parse(response.body).code).toBe('INTERNAL_ERROR');
    });
  });
});

import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Geolocation Routes
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
        { id: 1, nombre: 'Aguascalientes' },
        { id: 2, nombre: 'Jalisco' },
      ];
      (db.execute as Mock).mockResolvedValueOnce([mockStates]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/states',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockStates);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, nombre FROM estados')
      );
    });

    it('should handle database errors on states fetch', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/states',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toBe('Failed to fetch states');
    });
  });

  describe('GET /v1/geolocation/states/:stateId/municipalities', () => {
    it('should fetch municipalities by state successfully', async (): Promise<void> => {
      const mockMun = [{ id: 10, nombre: 'Zapopan' }];
      (db.execute as Mock).mockResolvedValueOnce([mockMun]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/states/2/municipalities',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockMun);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, nombre FROM municipios WHERE estado = ?'),
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
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('AND nombre LIKE ?'), [
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
      expect(JSON.parse(response.body).error).toBe('Failed to fetch municipalities');
    });
  });

  describe('GET /v1/geolocation/municipalities/:municipioId/colonias', () => {
    it('should fetch colonias by municipality successfully', async (): Promise<void> => {
      const mockCol = [{ id: 100, nombre: 'Centro', codigoPostal: 44100, ciudad: 'Guadalajara' }];
      (db.execute as Mock).mockResolvedValueOnce([mockCol]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/municipalities/10/colonias',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockCol);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT id, nombre, codigo_postal as codigoPostal, ciudad FROM colonias WHERE municipio = ?'
        ),
        ['10']
      );
    });

    it('should search colonias with search query by name or zip code', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/municipalities/10/colonias?q=441',
      });

      expect(response.statusCode).toBe(200);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('AND (nombre LIKE ? OR codigo_postal LIKE ?)'),
        ['10', '%441%', '%441%']
      );
    });

    it('should handle database errors on colonias fetch', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/municipalities/10/colonias',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toBe('Failed to fetch colonias');
    });
  });

  describe('GET /v1/geolocation/colonias/:coloniaId', () => {
    it('should fetch colonia details by ID successfully', async (): Promise<void> => {
      const mockDetail = {
        id: 100,
        nombre: 'Centro',
        codigoPostal: 44100,
        municipioId: 10,
        stateId: 2,
      };
      (db.execute as Mock).mockResolvedValueOnce([[mockDetail]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/colonias/100',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockDetail);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.id, c.nombre, c.codigo_postal as codigoPostal'),
        ['100']
      );
    });

    it('should return 404 when colonia details are not found', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/colonias/999',
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toBe('Colonia not found');
    });

    it('should handle database errors on details fetch', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/geolocation/colonias/100',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toBe('Failed to fetch colonia details');
    });
  });
});

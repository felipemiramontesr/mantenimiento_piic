import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Fleet Routes
 * Implementation: 100% Contract Verification (Pillar 2 - v.17.0.0)
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn(),
    query: vi.fn(),
  },
}));

describe('Fleet Integration Endpoints', () => {
  const app = buildApp();
  let mockToken: string;

  beforeAll(async () => {
    await app.ready();
    mockToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'admin@piic.mx' });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const authHeader = (): Record<string, string> => ({
    Authorization: `Bearer ${mockToken}`,
  });

  describe('POST /v1/fleet', () => {
    const validUnit = {
      assetType: 'Vehiculo',
      tag: 'ASM-001',
      marca: 'Toyota',
      modelo: 'Hilux',
      year: 2024,
      departamento: 'Admin',
      uso: 'General',
      traccion: '4x2',
      transmision: 'Estándar (Manual)',
      fuelType: 'Diesel',
      maintenanceFrequency: 'Mensual',
      centroMantenimiento: 'PIIC',
      odometer: 100,
      protocolStartDate: '2026-04-16',
    };

    it('should successfully register a new unit and return 201', async (): Promise<void> => {
      (
        db.execute as unknown as {
          mockResolvedValueOnce: (_v1: unknown) => {
            mockResolvedValueOnce: (_v2: unknown) => {
              mockResolvedValueOnce: (_v3: unknown) => {
                mockResolvedValueOnce: (_v4: unknown) => void;
              };
            };
          };
        }
      )
        .mockResolvedValueOnce([[]]) // Tag unique check
        .mockResolvedValueOnce([[]]) // Serie hash unique check
        .mockResolvedValueOnce([[{ id: 'FL042' }]]) // Get last ID
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert

      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: { ...validUnit, numeroSerie: 'SN123' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.id).toBe('FL043');
    });

    it('should handle database errors during POST', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('CONNECTION_LOST'));
      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: validUnit,
      });
      expect(response.statusCode).toBe(500);
    });

    it('should return 401 if no token is provided', async (): Promise<void> => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        payload: validUnit,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 409 if the tag (Economic Number) already exists', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]); // Tag exists

      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: validUnit,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('GET /v1/fleet', () => {
    it('should return a list of fleet units', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 'FL001',
            tag: 'ASM-001',
            asset_type: 'Vehiculo',
            marca: 'Toyota',
            modelo: 'Hilux',
            placas: null,
            numero_serie: null,
            motor: null,
            tarjeta_circulacion: null,
          },
        ],
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should handle database errors during GET', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));
      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: authHeader(),
      });
      expect(response.statusCode).toBe(500);
    });
  });

  describe('PATCH /v1/fleet/:id', () => {
    it('should update a unit and return 200', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/FL001',
        headers: authHeader(),
        payload: { odometer: 200, fuelType: 'Eléctrico' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle blind index updates for placas', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/FL001',
        headers: authHeader(),
        payload: { placas: 'NEW-PL-456' },
      });

      expect(response.statusCode).toBe(200);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('placas_hash = ?'),
        expect.any(Array)
      );
    });

    it('should return 400 if no data is provided for update', async (): Promise<void> => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/FL001',
        headers: authHeader(),
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle database errors during PATCH', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('UPDATE_FAIL'));
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/FL001',
        headers: authHeader(),
        payload: { odometer: 200 },
      });
      expect(response.statusCode).toBe(500);
    });

    it('should return 404 if unit does not exist', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/NONEXISTENT',
        headers: authHeader(),
        payload: { odometer: 200 },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /v1/fleet/:id', () => {
    it('should decommission a unit correctly', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/fleet/FL001',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle database errors during DELETE', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DELETE_FAIL'));
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/fleet/FL001',
        headers: authHeader(),
      });
      expect(response.statusCode).toBe(500);
    });

    it('should return 404 if unit to delete is not found', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/fleet/FL001',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

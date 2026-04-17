import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Fleet Routes
 * Implementation: 100% Path & Branch Coverage (Pillar 2 - v.17.0.0)
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn(),
    query: vi.fn(),
  },
}));

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v) => `enc_${v}`),
    decrypt: vi.fn((v) => (v && typeof v === 'string' ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v) => `hash_${v}`),
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

    it('should successfully register a new unit with all fields', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[]]) // Tag unique
        .mockResolvedValueOnce([[]]) // Serie unique
        .mockResolvedValueOnce([[{ id: 'FL042' }]]) // Last ID
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert

      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: {
          ...validUnit,
          numeroSerie: 'SN-100',
          placas: 'PL-100',
          motor: 'MOT-100',
          tarjetaCirculacion: 'TC-100',
          images: ['img1.jpg'],
        },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body).id).toBe('FL043');
    });

    it('should handle undefined optional fields in mapping', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ id: 'FL001' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: { ...validUnit, tag: 'UNDEF-1', fuelType: undefined },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should return 409 for duplicate serial number', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ id: 1 }]]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: { ...validUnit, numeroSerie: 'DUP-SN' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should handle unknown db errors', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce({});
      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: validUnit,
      });
      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain('Unknown DB Exception');
    });

    it('should return 409 for duplicate economic number (tag)', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]); // Tag exists

      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: validUnit,
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body).error).toContain('Número Económico');
    });

    it('should return 400 for invalid schema', async (): Promise<void> => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: { year: 'STRING' },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/fleet', () => {
    it('should return list with decrypted and null fields', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([
        [
          { id: 'FL001', motor: 'enc_MOT1', tarjeta_circulacion: null },
          { id: 'FL002', motor: null, tarjeta_circulacion: 'enc_TC2' },
        ],
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.body);
      expect(data[0].motor).toBe('MOT1');
      expect(data[0].tarjeta_circulacion).toBeNull();
      expect(data[1].motor).toBeNull();
      expect(data[1].tarjeta_circulacion).toBe('TC2');
    });

    it('should handle db error', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('FAIL'));
      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: authHeader(),
      });
      expect(response.statusCode).toBe(500);
    });
  });

  describe('PATCH /v1/fleet/:id', () => {
    it('should update complex fields', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/FL001',
        headers: authHeader(),
        payload: {
          motor: 'NEW-MOT',
          tarjetaCirculacion: 'NEW-TC',
          numeroSerie: 'NEW-SN',
          placas: 'NEW-PL',
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle db error on PATCH', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('FAIL'));
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/FL001',
        headers: authHeader(),
        payload: { year: 2026 },
      });
      expect(response.statusCode).toBe(500);
    });

    it('should return 404 if not found', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 0 }]);
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/NON',
        headers: authHeader(),
        payload: { year: 2025 },
      });
      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for empty update', async (): Promise<void> => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/FL001',
        headers: authHeader(),
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /v1/fleet/:id', () => {
    it('should delete successfully', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/fleet/FL001',
        headers: authHeader(),
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if missing', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 0 }]);
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/fleet/FL001',
        headers: authHeader(),
      });
      expect(response.statusCode).toBe(404);
    });

    it('should handle db error', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('FAIL'));
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/fleet/FL001',
        headers: authHeader(),
      });
      expect(response.statusCode).toBe(500);
    });
  });
});

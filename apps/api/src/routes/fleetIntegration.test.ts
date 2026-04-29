import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Fleet Routes (v.21.3.1)
 * Implementation: 100% Path & Branch Coverage
 * Architecture: Relational ID Adaptive Testing
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

  const authHeader = (token = mockToken): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
  });

  describe('Global Hooks (onRequest)', () => {
    it('should return 401 if token is invalid', async (): Promise<void> => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: { Authorization: 'Bearer invalid_token' },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /v1/fleet', () => {
    const validUnit = {
      assetTypeId: 1, // Vehiculo
      id: 'ASM-001',
      brandId: 253, // Toyota
      modelId: 636, // Hilux
      year: 2024,
      departmentId: 228, // Medio Ambiente
      operationalUseId: 236, // Staff
      traccionId: 1, // 4x2
      transmisionId: 2, // Estándar
      fuelTypeId: 10, // Diesel
      maintenanceTimeFreqId: 4, // Mensual
      maintenanceUsageFreqId: 6, // 5,000 KM
      centroMantenimiento: 'PIIC',
      odometer: 100,
      protocolStartDate: '2026-04-16',
      fuelTankCapacity: 80,
      maintIntervalDays: 90,
      maintIntervalKm: 5000,
    };

    it('should successfully register a new unit with all security fields', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[]]) // ID unique check
        .mockResolvedValueOnce([[]]) // Serie unique check
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert

      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: {
          ...validUnit,
          numeroSerie: 'SN-100',
          placas: 'PL-100',
          engineTypeId: 1,
          circulationCardNumber: 'TC-100',
          images: ['img1.jpg'],
        },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body).id).toBe('ASM-001');
    });

    it('should handle undefined optional fields in mapping', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[]]) // ID check
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert

      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: { ...validUnit, id: 'UNDEF-1', fuelTypeId: undefined },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should register unit with default odometer (branch coverage)', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[]]) // ID check
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert

      const { odometer: _, ...unitWithoutOdometer } = validUnit;

      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: { ...unitWithoutOdometer, id: 'ODOM-DEF' },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should return 409 for duplicate serial number', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[]]) // ID unique
        .mockResolvedValueOnce([[{ id: 1 }]]); // Serie exists

      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: { ...validUnit, numeroSerie: 'DUP-SN' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 409 for duplicate identification (id)', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]); // ID exists

      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: validUnit,
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body).error).toContain('ya existe');
    });

    it('should handle unknown db errors (null rejection)', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(null);
      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: validUnit,
      });
      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain('Database Error: Unknown DB Exception');
    });

    it('should handle string-based db errors', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce('CRITICAL_STR_FAIL');
      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: validUnit,
      });
      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain('Database Error: CRITICAL_STR_FAIL');
    });

    it('should handle object-based db errors (sqlMessage)', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce({ sqlMessage: 'SQL_SYNTAX_ERR' });
      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: validUnit,
      });
      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain('Database Error: SQL_SYNTAX_ERR');
    });

    it('should handle object-based db errors (Standard Error)', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('STD_ERR_MSG'));
      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: validUnit,
      });
      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain('Database Error: STD_ERR_MSG');
    });

    it('should handle object-based db errors (Empty object fallback)', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce({});
      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: validUnit,
      });
      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain('Database Error: Unknown DB Exception');
    });

    it('should return 400 for invalid data format in POST', async (): Promise<void> => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: { year: 'STRING' }, // Trigger Zod failure
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/fleet', () => {
    it('should return list with decrypted and null fields', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 'ASM-001',
            motor: 'L4 2.8L Turbo',
            engineTypeId: 1,
            circulationCardNumber: null,
            numeroSerie: 'enc_SN1',
            placas: 'enc_PL1',
            availabilityIndex: 85.5,
            mtbfHours: 50.0,
            mttrHours: 12.0,
            backlogCount: 2,
          },
          {
            id: 'ASM-002',
            motor: null,
            engineTypeId: null,
            circulationCardNumber: 'enc_TC2',
            numeroSerie: null,
            placas: null,
          },
        ],
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.body);
      expect(data[0].motor).toBe('L4 2.8L Turbo');
      expect(data[0].numeroSerie).toBe('SN1');
      expect(data[0].placas).toBe('PL1');
      expect(data[0].circulationCardNumber).toBeNull();
      expect(data[1].motor).toBeNull();
      expect(data[1].circulationCardNumber).toBe('TC2');
    });

    it('should calculate complex health states for predictive maintenance', async (): Promise<void> => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 40); // 40 days ago

      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 'OVERDUE_01',
            currentReading: 6000,
            lastServiceReading: 0,
            maintIntervalKm: 5000,
            lastServiceDate: pastDate.toISOString(),
            maintIntervalDays: 30,
            motor: null,
            circulationCardNumber: null,
            numeroSerie: null,
            placas: null,
          },
          {
            id: 'CAUTION_01',
            currentReading: 4000,
            lastServiceReading: 0,
            maintIntervalKm: 5000,
            lastServiceDate: null,
            maintIntervalDays: null,
            motor: null,
            circulationCardNumber: null,
            numeroSerie: null,
            placas: null,
          },
          {
            id: 'HEALTHY_01',
            currentReading: 1000,
            lastServiceReading: 0,
            maintIntervalKm: 5000,
            lastServiceDate: new Date().toISOString(),
            maintIntervalDays: 30,
            motor: null,
            circulationCardNumber: null,
            numeroSerie: null,
            placas: null,
          },
        ],
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.body);

      expect(data[0].healthStatus).toBe('Overdue');
      expect(data[0].healthColor).toBe('#ef4444');
      expect(data[1].healthStatus).toBe('Caution');
      expect(data[1].healthColor).toBe('#f2b705');
      expect(data[2].healthStatus).toBe('Healthy');
      expect(data[2].daysSinceService).toBe(0);
    });

    it('should parse images from JSON string and handle corrupt data variants', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 'IMG_JSON',
            images: JSON.stringify(['img1.jpg']),
            motor: null,
            circulationCardNumber: null,
            numeroSerie: null,
            placas: null,
          },
          {
            id: 'IMG_ARRAY',
            images: ['img2.jpg'],
            motor: null,
            circulationCardNumber: null,
            numeroSerie: null,
            placas: null,
          },
          {
            id: 'IMG_CORRUPT',
            images: 'invalid-json-{',
            motor: null,
            circulationCardNumber: null,
            numeroSerie: null,
            placas: null,
          },
        ],
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.body);
      expect(data[0].images).toEqual(['img1.jpg']);
      expect(data[1].images).toEqual(['img2.jpg']);
      expect(data[2].images).toEqual([]);
    });

    it('should handle db error', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('FAIL'));
      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: authHeader(),
      });
      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toBe('Internal Database Exception');
    });
  });

  describe('PATCH /v1/fleet/:id', () => {
    it('should update unit with all security branches', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]); // Update

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
        payload: {
          engineTypeId: 2,
          numeroSerie: 'NEW-SN',
          placas: 'NEW-PL',
          circulationCardNumber: 'NEW-TC',
          assetTypeId: 2, // Maquinaria
          year: 2025,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 for invalid update data', async (): Promise<void> => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
        payload: { year: 'INVALID' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('should handle db error on PATCH', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('FAIL'));
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
        payload: { year: 2026 },
      });
      expect(response.statusCode).toBe(500);
    });

    it('should return 404 if not found', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 0 }]); // Not found
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/NON-EXISTENT',
        headers: authHeader(),
        payload: { year: 2025 },
      });
      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for empty update', async (): Promise<void> => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
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
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if missing in registry', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 0 }]);
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
      });
      expect(response.statusCode).toBe(404);
    });

    it('should handle db error', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('FAIL'));
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
      });
      expect(response.statusCode).toBe(500);
    });
  });
});

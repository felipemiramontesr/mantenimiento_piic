import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Fleet Routes (v.22.0.1)
 * Implementation: Plan Omega Logic Verification
 * Architecture: Zero-Filesystem Dependency Testing
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
      assetTypeId: 1,
      id: 'ASM-001',
      brandId: 253,
      modelId: 636,
      year: 2024,
      departmentId: 228,
      operationalUseId: 236,
      traccionId: 1,
      transmisionId: 2,
      fuelTypeId: 10,
      odometer: 100,
      fuelTankCapacity: 80,
      maintIntervalDays: 90,
      maintIntervalKm: 5000,
    };

    it('should successfully register a new unit with Base64 images (Plan Omega)', async (): Promise<void> => {
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
          numeroSerie: 'SN-OMEGA-1',
          images: ['data:image/jpeg;base64,fake_omega_data'],
        },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body).id).toBe('ASM-001');
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
    });

    it('should return 400 for invalid data format in POST', async (): Promise<void> => {
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
    it('should return list with processed Base64 images', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 'ASM-001',
            images: JSON.stringify(['data:image/jpeg;base64,abc']),
            availabilityIndex: 100,
            currentReading: 1000,
            lastServiceReading: 0,
            maintIntervalKm: 5000,
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
      expect(data[0].images[0]).toBe('data:image/jpeg;base64,abc');
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
    it('should update unit successfully', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
        payload: { year: 2025 },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if not found', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 0 }]);
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/NON-EXISTENT',
        headers: authHeader(),
        payload: { year: 2025 },
      });
      expect(response.statusCode).toBe(404);
    });

    it('should handle empty update payload', async (): Promise<void> => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it('should handle db error on update', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('CRITICAL_FAIL'));
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
        payload: { year: 2025 },
      });
      expect(response.statusCode).toBe(500);
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

    it('should handle db error on delete', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DELETE_FAIL'));
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
      });
      expect(response.statusCode).toBe(500);
    });
  });

  describe('FleetIntelligence & Edge Cases', () => {
    it('should handle units with all encrypted fields and calculate service metrics', async (): Promise<void> => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 'FULL_01',
            images: JSON.stringify(['data:image/png;base64,123']),
            placas: 'enc_ABC-123',
            numeroSerie: 'enc_SERIE-X',
            circulationCardNumber: 'enc_CARD-99',
            lastServiceDate: pastDate.toISOString(),
            currentReading: 1000,
            lastServiceReading: 900,
            availabilityIndex: 100,
            maintIntervalKm: 5000,
            maintIntervalDays: 30,
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
      expect(data[0].placas).toBe('ABC-123');
      expect(data[0].daysSinceService).toBe(10);
      expect(data[0].unitsSinceService).toBe(100);
    });

    it('should trigger all encryption branches in FleetService', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[]]) // ID check
        .mockResolvedValueOnce([[]]) // Serie check
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Insert

      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: {
          assetTypeId: 1,
          id: 'ENC-TEST-99',
          brandId: 1,
          modelId: 1,
          year: 2024,
          fuelTankCapacity: 50,
          operationalUseId: 1,
          departmentId: 1,
          placas: 'FULL-PLAT',
          circulationCardNumber: 'FULL-CARD',
          numeroSerie: 'FULL-SERIE',
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should handle corrupted JSON in images and generic DB errors', async (): Promise<void> => {
      // Branch in fleet.ts: Generic DB error on POST (sqlMessage)
      (db.execute as Mock).mockRejectedValueOnce({ sqlMessage: 'SQL_SYNTAX' });
      const rSql = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: {
          assetTypeId: 1,
          id: 'FAIL-SQL',
          brandId: 1,
          modelId: 1,
          year: 2024,
          fuelTankCapacity: 50,
          operationalUseId: 1,
          departmentId: 1,
        },
      });
      expect(rSql.statusCode).toBe(500);

      // Branch in fleet.ts: Generic DB error on POST (string)
      (db.execute as Mock).mockRejectedValueOnce('STRING_ERROR');
      const rStr = await app.inject({
        method: 'POST',
        headers: authHeader(),
        url: '/v1/fleet',
        payload: {
          assetTypeId: 1,
          id: 'FAIL-STR',
          brandId: 1,
          modelId: 1,
          year: 2024,
          fuelTankCapacity: 50,
          operationalUseId: 1,
          departmentId: 1,
        },
      });
      expect(rStr.statusCode).toBe(500);

      // Branch in fleet.ts: Invalid format on PATCH
      const rInvalid = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ANY',
        headers: authHeader(),
        payload: { year: 'NOT_A_NUMBER' },
      });
      expect(rInvalid.statusCode).toBe(400);

      // Branch in intelligence: Corrupt JSON
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 'CORRUPT_01', images: '!!' }]]);

      const rCorrupt = await app.inject({
        method: 'GET',
        url: '/v1/fleet',
        headers: authHeader(),
      });

      expect(rCorrupt.statusCode).toBe(200);
    });
  });
});

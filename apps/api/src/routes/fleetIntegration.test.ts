import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: Fleet Routes (v.22.0.1)
 * Implementation: Plan Omega Logic Verification
 * Architecture: Zero-Filesystem Dependency Testing
 */

const mockConnection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([[], undefined]),
  query: vi.fn().mockResolvedValue([[], undefined]),
};

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
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
    ).jwt.sign({ id: 1, username: 'admin', roleId: 1, roleName: 'Director', permissions: ['*'] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as Mock).mockReset();
    mockConnection.execute.mockReset();
    // Restore default for security hooks etc
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    mockConnection.execute.mockResolvedValue([[], undefined]);
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
        .mockResolvedValueOnce([[], undefined]) // ID unique check
        .mockResolvedValueOnce([[], undefined]) // Serie unique check
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // Insert

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
            uuid: 'some-uuid',
            assetType: 'Vehículo',
            images: JSON.stringify(['data:image/jpeg;base64,abc']),
            availabilityIndex: 100,
            odometer: 1000,
            nextServiceReading: 5000,
            lastServiceDate: '2024-01-01',
          },
        ],
        undefined,
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

  describe('GET /v1/fleet/:id', () => {
    it('should return 200 and full unit data including images', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 'ASM-001',
            uuid: 'uuid-1',
            images: JSON.stringify(['data:image/png;base64,123']),
          },
        ],
        undefined,
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe('ASM-001');
      expect(body.data.images).toHaveLength(1);
    });

    it('should return 404 if unit does not exist', async (): Promise<void> => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet/MISSING',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 500 on db failure', async (): Promise<void> => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('PATCH /v1/fleet/:id', () => {
    it('should update unit successfully with falsy values for branch coverage', async (): Promise<void> => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 'ASM-001' }], undefined]) // Snapshot Before
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // Update
        .mockResolvedValueOnce([[{ id: 'ASM-001' }], undefined]); // Snapshot After

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
        payload: {
          data: {
            year: 2025,
            operationalUseId: null, // 🔱 Trigger Falsy branch
            odometer: 0, // 🔱 Trigger Falsy branch
            images: ['data:image/png;base64,patch'], // 🔱 Trigger Array branch
          },
          reason: 'Update for branch coverage',
        },
      });

      if (response.statusCode !== 200) throw new Error(`DEBUG AUTH BODY: ${response.body}`);
      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if not found', async (): Promise<void> => {
      mockConnection.execute.mockResolvedValueOnce([[], undefined]);
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/NON-EXISTENT',
        headers: authHeader(),
        payload: { data: { year: 2025 }, reason: 'Test 404' },
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

    it('should coerce string numeric fields to numbers (form input compat)', async (): Promise<void> => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 'ASM-001' }], undefined]) // Snapshot Before
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // Update
        .mockResolvedValueOnce([[{ id: 'ASM-001' }], undefined]); // Snapshot After

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
        payload: {
          data: {
            year: '2025',
            odometer: '12500',
            fuelTankCapacity: '80',
            dailyUsageAvg: '120.5',
          },
          reason: 'Coercion compatibility test',
        },
      });

      if (response.statusCode !== 200) throw new Error(`Coercion failed: ${response.body}`);
      expect(response.statusCode).toBe(200);
    });

    it('should handle db error on update', async (): Promise<void> => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 'ASM-001' }], undefined]) // Snapshot Before
        .mockRejectedValueOnce(new Error('CRITICAL_FAIL')); // Update fail
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
        payload: { data: { odometer: 2000 }, reason: 'Rectification for DB Error' },
      });
      expect(response.statusCode).toBe(500);
    });
  });

  describe('DELETE /v1/fleet/:id', () => {
    it('should delete successfully', async (): Promise<void> => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 'ASM-001' }], undefined]) // Snapshot Before
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // Delete

      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
        payload: { reason: 'Test delete' },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if missing in registry', async (): Promise<void> => {
      mockConnection.execute.mockResolvedValueOnce([[], undefined]);
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
        payload: { reason: 'Test 404' },
      });
      expect(response.statusCode).toBe(404);
    });

    it('should handle db error on delete', async (): Promise<void> => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 'ASM-001' }], undefined]) // Snapshot Before
        .mockRejectedValueOnce(new Error('CRITICAL_DELETE_FAIL')); // Delete fail
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/fleet/ASM-001',
        headers: authHeader(),
        payload: { reason: 'Test DB error' },
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
            uuid: 'forensic-uuid-test',
            assetType: 'Vehículo',
            images: JSON.stringify(['data:image/png;base64,123']),
            placas: 'enc_ABC-123',
            lastServiceDate: pastDate.toISOString(),
            circulationCardNumber: 'CARD-100',
            numeroSerie: 'SERIE-100',
            nextServiceReading: 5000,
            odometer: 1000,
            lastServiceReading: 900,
            availabilityIndex: 100,
            maintIntervalKm: 5000,
            maintIntervalDays: 30,
          },
        ],
        undefined,
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
      (db.execute as Mock).mockImplementation((q: string) => {
        if (q.includes('SELECT id FROM fleet_units WHERE id = ?'))
          return Promise.resolve([[], undefined]);
        if (q.includes('SELECT id FROM fleet_units WHERE numeroSerieHash = ?'))
          return Promise.resolve([[], undefined]);
        if (q.includes('INSERT INTO fleet_units'))
          return Promise.resolve([{ affectedRows: 1 }, undefined]);
        throw new Error(`🔱 MOCK_MISMATCH: ${q}`);
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/fleet',
        headers: authHeader(),
        payload: {
          assetTypeId: 1,
          id: 'ENC-TEST-100',
          brandId: 1,
          modelId: 1,
          year: 2024,
          fuelTankCapacity: 50,
          operationalUseId: 1,
          departmentId: 1,
          placas: 'PLAT-100',
          circulationCardNumber: 'CARD-100',
          numeroSerie: 'SERIE-100',
          images: ['data:image/png;base64,123'],
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should handle corrupted JSON in images and generic DB errors', async (): Promise<void> => {
      (db.execute as Mock).mockReset();
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

      // Branch in fleet.ts: Generic DB error on POST (Empty Object fallback)
      (db.execute as Mock).mockRejectedValueOnce({});
      const rEmpty = await app.inject({
        method: 'POST',
        headers: authHeader(),
        url: '/v1/fleet',
        payload: {
          assetTypeId: 1,
          id: 'FAIL-EMPTY',
          brandId: 1,
          modelId: 1,
          year: 2024,
          fuelTankCapacity: 50,
          operationalUseId: 1,
          departmentId: 1,
        },
      });
      expect(rEmpty.statusCode).toBe(500);
      expect(JSON.parse(rEmpty.body).error).toContain('Unknown DB Exception');

      // Branch in fleet.ts: Invalid format on PATCH
      const rInvalid = await app.inject({
        method: 'PATCH',
        url: '/v1/fleet/ANY',
        headers: authHeader(),
        payload: { year: 'NOT_A_NUMBER' },
      });
      expect(rInvalid.statusCode).toBe(400);

      // Branch in intelligence: Corrupt JSON & Legacy filenames & Direct Arrays
      // Each GET /fleet now makes 4 db.execute calls: 1 main + 3 KPI (MTTR/MTBF/BCK).
      // Interleave empty-array KPI mocks between each real fleet-row mock.
      (db.execute as Mock).mockReset();
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 'CORRUPT_01', images: '!!' }]]) // GET 1 — main
        .mockResolvedValueOnce([[], undefined]) // GET 1 — KPI MTTR
        .mockResolvedValueOnce([[], undefined]) // GET 1 — KPI MTBF
        .mockResolvedValueOnce([[], undefined]) // GET 1 — KPI BCK
        .mockResolvedValueOnce([[{ id: 'LEGACY_01', images: JSON.stringify(['foto_vieja.jpg']) }]]) // GET 2
        .mockResolvedValueOnce([[], undefined]) // GET 2 — KPI MTTR
        .mockResolvedValueOnce([[], undefined]) // GET 2 — KPI MTBF
        .mockResolvedValueOnce([[], undefined]) // GET 2 — KPI BCK
        .mockResolvedValueOnce([[{ id: 'ARRAY_01', images: ['direct_array.jpg'] }]]) // GET 3
        .mockResolvedValueOnce([[], undefined]) // GET 3 — KPI MTTR
        .mockResolvedValueOnce([[], undefined]) // GET 3 — KPI MTBF
        .mockResolvedValueOnce([[], undefined]); // GET 3 — KPI BCK

      // Test Corrupt
      await app.inject({ method: 'GET', url: '/v1/fleet', headers: authHeader() });

      // Test Legacy
      const rLegacy = await app.inject({ method: 'GET', url: '/v1/fleet', headers: authHeader() });
      const legacyData = JSON.parse(rLegacy.body).data;
      expect(legacyData[0].images[0]).toContain('/v1/fleet/asset/foto_vieja.jpg');

      // Test Direct Array
      const rArray = await app.inject({ method: 'GET', url: '/v1/fleet', headers: authHeader() });
      const arrayData = JSON.parse(rArray.body).data;
      expect(arrayData[0].images[0]).toContain('/v1/fleet/asset/direct_array.jpg');
    });
  });
});

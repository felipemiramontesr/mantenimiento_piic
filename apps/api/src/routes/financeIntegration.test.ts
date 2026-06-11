import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

// ─── KPI mock rows ────────────────────────────────────────────────────────────

const KPI_ROW = [
  {
    totalEgresos: '500000',
    totalMaintenance: '150000',
    totalFuel: '80000',
    totalInsurance: '70000',
    totalLeaseRegistered: '100000',
    totalTire: '30000',
    totalFine: '10000',
    totalRepair: '50000',
    totalOther: '10000',
  },
];

const UNIT_COUNT_ROW = [{ unitCount: 23 }];

describe('Finance Routes — JWT Auth (Integration)', () => {
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

  beforeEach((): void => {
    vi.clearAllMocks();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
  });

  const authHeader = (): Record<string, string> => ({ Authorization: `Bearer ${token}` });

  // ─── 401 sin token ───────────────────────────────────────────────────────────

  describe('GET /finance/dashboard — sin token', () => {
    it('returns 401 UNAUTHORIZED', async (): Promise<void> => {
      const res = await app.inject({ method: 'GET', url: '/v1/finance/dashboard' });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body) as { success: boolean; code: string };
      expect(body.success).toBe(false);
      expect(body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /finance/transactions — sin token', () => {
    it('returns 401 UNAUTHORIZED', async (): Promise<void> => {
      const res = await app.inject({ method: 'GET', url: '/v1/finance/transactions' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /finance/transactions — sin token', () => {
    it('returns 401 UNAUTHORIZED', async (): Promise<void> => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        payload: { unitId: 'ASM-001', category: 'FUEL', amount: 500 },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /finance/export — sin token', () => {
    it('returns 401 UNAUTHORIZED', async (): Promise<void> => {
      const res = await app.inject({ method: 'GET', url: '/v1/finance/export' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── 200 con token ───────────────────────────────────────────────────────────

  describe('GET /finance/dashboard — con token válido', () => {
    it('returns 200 with byMonth and topUnits populated (lines 200-201, 204-205)', async (): Promise<void> => {
      const monthRow = { period: '2026-05', amount: '120000' };
      const topUnitRow = { unitId: 'ASM-001', amount: '75000' };
      (db.execute as Mock)
        .mockResolvedValueOnce([KPI_ROW, undefined])
        .mockResolvedValueOnce([UNIT_COUNT_ROW, undefined])
        .mockResolvedValueOnce([[], undefined]) // byCategory empty
        .mockResolvedValueOnce([[monthRow], undefined]) // byMonth
        .mockResolvedValueOnce([[topUnitRow], undefined]); // topUnits

      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/dashboard',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.byMonth).toHaveLength(1);
      expect(body.data.byMonth[0].period).toBe('2026-05');
      expect(body.data.byMonth[0].amount).toBe(120000);
      expect(body.data.topUnits).toHaveLength(1);
      expect(body.data.topUnits[0].unitId).toBe('ASM-001');
      expect(body.data.topUnits[0].amount).toBe(75000);
    });

    it('returns 200 with dashboard data', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([KPI_ROW, undefined])
        .mockResolvedValueOnce([UNIT_COUNT_ROW, undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/dashboard',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as {
        success: boolean;
        data: { kpis: { totalEgresos: number } };
      };
      expect(body.success).toBe(true);
      expect(body.data.kpis.totalEgresos).toBe(500000);
    });
  });

  describe('POST /finance/transactions — con token válido', () => {
    it('returns 201 and uses request.user.id as createdBy', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 'ASM-001' }], undefined])
        .mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, undefined]);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: authHeader(),
        payload: { unitId: 'ASM-001', category: 'FUEL', amount: 750 },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body) as { success: boolean; data: { uuid: string } };
      expect(body.success).toBe(true);
      expect(body.data.uuid).toBeDefined();

      const insertCall = (db.execute as Mock).mock.calls[1];
      const insertParams = insertCall[1] as unknown[];
      expect(insertParams[8]).toBe(1);
    });
  });

  // ─── Dashboard edge cases ────────────────────────────────────────────────────

  describe('GET /finance/dashboard — edge cases', () => {
    it('returns 400 for invalid from date format', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/dashboard?from=not-a-date',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when from > to', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/dashboard?from=2026-06&to=2026-01',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('anterior');
    });

    it('returns 200 with avgCostPerUnit = 0 when unitCount is 0', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([KPI_ROW, undefined])
        .mockResolvedValueOnce([[{ unitCount: 0 }], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/dashboard',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.kpis.avgCostPerUnit).toBe(0);
    });

    it('returns 500 on db error', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/dashboard',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ─── GET /finance/transactions ───────────────────────────────────────────────

  describe('GET /finance/transactions', () => {
    it('returns 200 with transaction list', async () => {
      const txRow = {
        id: 1,
        uuid: 'tx-uuid-1',
        unit_id: 'ASM-001',
        category: 'FUEL',
        amount: 500,
        period: '2026-06',
        source: 'MANUAL',
        vendor: null,
        invoice_ref: null,
        notes: null,
        created_by_name: 'Admin',
        created_at: new Date('2026-06-01'),
      };
      (db.execute as Mock)
        .mockResolvedValueOnce([[txRow], undefined])
        .mockResolvedValueOnce([[{ total: 1 }], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/transactions',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.meta.total).toBe(1);
      expect(body.meta.nextCursor).toBeNull();
    });

    it('returns nextCursor when rows exceed limit', async () => {
      const makeRow = (id: number): Record<string, unknown> => ({
        id,
        uuid: `tx-uuid-${id}`,
        unit_id: 'ASM-001',
        category: 'FUEL',
        amount: 100,
        period: '2026-06',
        source: 'MANUAL',
        vendor: null,
        invoice_ref: null,
        notes: null,
        created_by_name: 'Admin',
        created_at: new Date('2026-06-01'),
      });
      // limit=2, return 3 rows so rows.length > parsedLimit triggers nextCursor
      const rows = [makeRow(1), makeRow(2), makeRow(3)];
      (db.execute as Mock)
        .mockResolvedValueOnce([rows, undefined])
        .mockResolvedValueOnce([[{ total: 10 }], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/transactions?limit=2',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.meta.nextCursor).not.toBeNull();
      expect(body.data).toHaveLength(2);
    });

    it('applies category and unitId filters', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[{ total: 0 }], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/transactions?category=FUEL&unitId=ASM-001',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(200);
    });

    it('applies cursor for pagination', async () => {
      const cursor = Buffer.from('2026-06-01T00:00:00.000Z|5').toString('base64');
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[{ total: 0 }], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: `/v1/finance/transactions?cursor=${encodeURIComponent(cursor)}`,
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 500 on db error', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/transactions',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ─── POST /finance/transactions error paths ──────────────────────────────────

  describe('POST /finance/transactions — error paths', () => {
    it('returns 403 with financial:view only token', async () => {
      const viewToken = app.jwt.sign({
        id: 2,
        username: 'viewer',
        roleId: 3,
        roleName: 'Viewer',
        permissions: ['financial:view'],
      });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: { authorization: `Bearer ${viewToken}` },
        payload: { unitId: 'ASM-001', category: 'FUEL', amount: 100 },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 400 on validation error (missing amount)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: authHeader(),
        payload: { unitId: 'ASM-001', category: 'FUEL' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 on invalid category', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: authHeader(),
        payload: { unitId: 'ASM-001', category: 'INVALID', amount: 100 },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 when unit not found', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: authHeader(),
        payload: { unitId: 'NONEXISTENT', category: 'FUEL', amount: 100 },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 500 on db error', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: authHeader(),
        payload: { unitId: 'ASM-001', category: 'FUEL', amount: 100 },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ─── GET /finance/export ─────────────────────────────────────────────────────

  describe('GET /finance/export', () => {
    it('returns CSV response with correct headers', async () => {
      const csvRow = {
        uuid: 'tx-uuid-export',
        unit_name: 'ASM-001',
        category: 'MAINTENANCE',
        amount: 1500,
        period: '2026-06',
        vendor: 'Taller Central',
        invoice_ref: 'FAC-001',
        notes: 'Cambio de aceite',
        created_by_name: 'Admin',
        created_at: '2026-06-01',
      };
      (db.execute as Mock).mockResolvedValueOnce([[csvRow], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/export',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.body).toContain('tx-uuid-export');
      expect(res.body).toContain('UUID,Unidad');
    });

    it('applies category filter in export query', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/export?category=FUEL',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 500 on db error', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB error'));
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/export',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(500);
    });
  });
});

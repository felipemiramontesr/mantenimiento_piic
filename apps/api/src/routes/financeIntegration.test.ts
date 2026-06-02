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
});

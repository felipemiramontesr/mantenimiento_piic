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
        .mockResolvedValueOnce([[{ id: 'ASM-001' }], undefined]) // unit check
        .mockResolvedValueOnce([[{ id: 9103 }], undefined]) // resolveCatalogId FINANCE_CATEGORY
        .mockResolvedValueOnce([[{ id: 9111 }], undefined]) // resolveCatalogId FINANCE_SOURCE
        .mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, undefined]); // INSERT

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

      const insertCall = (db.execute as Mock).mock.calls[3];
      const insertParams = insertCall[1] as unknown[];
      // FC 082 F2b3a: el ENUM ya no se escribe, los índices se recorren.
      expect(insertParams[2]).toBe(9103); // category_id
      expect(insertParams[5]).toBe(9111); // source_id
      expect(insertParams[9]).toBe(1); // createdBy
    });

    it('returns 400 VALIDATION_ERROR when category is not catalogued (FC 082 F2b1 Cond.2 fail-closed)', async (): Promise<void> => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 'ASM-001' }], undefined]) // unit check
        .mockResolvedValueOnce([[], undefined]); // resolveCatalogId FINANCE_CATEGORY → not found

      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: authHeader(),
        payload: { unitId: 'ASM-001', category: 'FUEL', amount: 750 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
      expect(res.json().field).toBe('category');
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

    it('returns 400 VALIDATION_ERROR when the Archonaut allowlist has an uncatalogued code (FC 082 F2b3a fail-closed)', async () => {
      const scopedToken = app.jwt.sign({
        id: 7,
        username: 'archonaut.user',
        roleId: 2,
        permissions: ['fleet:scoped', 'finance:dashboard:view:any'],
      });
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 7 }], undefined]) // getUserOwnerIds → [7]
        .mockResolvedValueOnce([
          [{ ownerId: 7, ownerType: 'ARCHONAUT', clusterActive: 1 }],
          undefined,
        ])
        // resolveCategoryFilterIds: solo 6 de las 7 categorías del allowlist
        // existen en common_catalogs (falta OTHER) → fail-closed, lanza.
        .mockResolvedValueOnce([
          [
            { id: 9102, code: 'MAINTENANCE' },
            { id: 9103, code: 'FUEL' },
            { id: 9104, code: 'TIRE' },
            { id: 9106, code: 'REPAIR' },
            { id: 9107, code: 'TENENCIA' },
            { id: 9108, code: 'VERIFICACION' },
          ],
          undefined,
        ]);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/dashboard',
        headers: { Authorization: `Bearer ${scopedToken}` },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
    });

    it('returns 200 with byCategory populated (lines 195-198 map callback)', async () => {
      const categoryRow = { category: 'MAINTENANCE', amount: '85000' };
      (db.execute as Mock)
        .mockResolvedValueOnce([KPI_ROW, undefined])
        .mockResolvedValueOnce([UNIT_COUNT_ROW, undefined])
        .mockResolvedValueOnce([[categoryRow], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/dashboard',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.byCategory).toHaveLength(1);
      expect(body.data.byCategory[0].category).toBe('MAINTENANCE');
      expect(body.data.byCategory[0].amount).toBe(85000);
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
        .mockResolvedValueOnce([[{ id: 9105 }], undefined]) // FC 082 F2b3a: resolveCatalogId FUEL
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[{ total: 0 }], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/transactions?category=FUEL&unitId=ASM-001',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 400 VALIDATION_ERROR when category query param is not catalogued (FC 082 F2b3a fail-closed)', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // resolveCatalogId — sin fila
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/transactions?category=NOPE',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
    });

    it('GET /finance/transactions — Cúmulo inactivo → 403', async () => {
      const scopedToken = app.jwt.sign({
        id: 5,
        username: 'scoped.user',
        roleId: 2,
        permissions: ['fleet:scoped', 'finance:dashboard:view:any'],
      });
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }], undefined]) // getUserOwnerIds → [5]
        .mockResolvedValueOnce([
          [{ ownerId: 5, ownerType: 'FLOTILLA', clusterActive: 0 }],
          undefined,
        ]);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/transactions',
        headers: { Authorization: `Bearer ${scopedToken}` },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().code).toBe('FORBIDDEN');
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
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 9105 }], undefined]) // FC 082 F2b3a: resolveCatalogId FUEL
        .mockResolvedValueOnce([[], undefined]);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/export?category=FUEL',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 400 VALIDATION_ERROR when export category is not catalogued (FC 082 F2b3a fail-closed)', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // resolveCatalogId — sin fila
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/export?category=NOPE',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
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

    it('returns empty CSV header when scoped user has no owner memberships (covers lines 479-487)', async () => {
      const scopedToken = app.jwt.sign({
        id: 5,
        username: 'scoped.user',
        roleId: 2,
        permissions: ['fleet:scoped', 'finance:dashboard:view:any'],
      });
      // FleetService.getUserOwnerIds calls db.execute → empty result → ownerScope=[]
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/export',
        headers: { Authorization: `Bearer ${scopedToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.body).toBe(
        'UUID,Unidad,Categoría,Monto,Período,Proveedor,Referencia,Notas,Registrado por,Fecha'
      );
    });

    it('Finance-BC-6: GET /finance/export scoped non-empty ownerIds → adds ownerScope filter (line 501)', async () => {
      const scopedToken = app.jwt.sign({
        id: 5,
        username: 'scoped.user',
        roleId: 2,
        permissions: ['fleet:scoped', 'finance:dashboard:view:any'],
      });
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }], undefined]) // getUserOwnerIds → [5]
        // FC 067 F4 — resolveFinanceClusterScope: Cúmulo gastos_egresos ACTIVE (T1 ⊤⊤)
        .mockResolvedValueOnce([
          [{ ownerId: 5, ownerType: 'FLOTILLA', clusterActive: 1 }],
          undefined,
        ])
        .mockResolvedValueOnce([[], undefined]); // export query → empty rows
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/export',
        headers: { Authorization: `Bearer ${scopedToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });

    it('GET /finance/export — Cúmulo inactivo → 403 antes de exportar', async () => {
      const scopedToken = app.jwt.sign({
        id: 5,
        username: 'scoped.user',
        roleId: 2,
        permissions: ['fleet:scoped', 'finance:dashboard:view:any'],
      });
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }], undefined]) // getUserOwnerIds → [5]
        .mockResolvedValueOnce([
          [{ ownerId: 5, ownerType: 'FLOTILLA', clusterActive: 0 }],
          undefined,
        ]); // Cúmulo gastos_egresos SUSPENDED (T1 ⊤⊥)
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/export',
        headers: { Authorization: `Bearer ${scopedToken}` },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().code).toBe('FORBIDDEN');
    });
  });

  describe('Finance Branch Coverage — scoped paths and edge cases', () => {
    it('Finance-BC-1: GET /finance/dashboard scoped empty ownerIds → early return (line 132)', async () => {
      const scopedToken = app.jwt.sign({
        id: 5,
        username: 'scoped.user',
        roleId: 2,
        permissions: ['fleet:scoped', 'finance:dashboard:view:any'],
      });
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // getUserOwnerIds → []
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/dashboard',
        headers: { Authorization: `Bearer ${scopedToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.kpis.totalEgresos).toBe(0);
    });

    it('Finance-BC-2: GET /finance/transactions scoped empty ownerIds → early return (line 298)', async () => {
      const scopedToken = app.jwt.sign({
        id: 5,
        username: 'scoped.user',
        roleId: 2,
        permissions: ['fleet:scoped', 'finance:dashboard:view:any'],
      });
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // getUserOwnerIds → []
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/transactions',
        headers: { Authorization: `Bearer ${scopedToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([]);
      expect(res.json().meta.total).toBe(0);
    });

    it('Finance-BC-3: GET /finance/transactions scoped non-empty ownerIds → adds ownerScope filter (lines 321, 361)', async () => {
      const scopedToken = app.jwt.sign({
        id: 5,
        username: 'scoped.user',
        roleId: 2,
        permissions: ['fleet:scoped', 'finance:dashboard:view:any'],
      });
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }], undefined]) // getUserOwnerIds → [5]
        // FC 067 F4 — resolveFinanceClusterScope: Cúmulo gastos_egresos ACTIVE (T1 ⊤⊤)
        .mockResolvedValueOnce([
          [{ ownerId: 5, ownerType: 'FLOTILLA', clusterActive: 1 }],
          undefined,
        ])
        .mockResolvedValueOnce([[], undefined]) // main transactions query
        .mockResolvedValueOnce([[{ total: 0 }], undefined]); // count query
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/transactions',
        headers: { Authorization: `Bearer ${scopedToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([]);
    });

    it('Finance-BC-4: GET /finance/transactions limit=0 → parseInt(0)||50 fallback (line 295)', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[{ total: 0 }], undefined]);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/transactions?limit=0',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(200);
    });

    it("Finance-BC-5: POST /finance/transactions no body → Zod error path[0]=undefined→??''(line 406)", async () => {
      // null body → z.object({}).safeParse(null) → error at path [] → path[0]=undefined → ??'' → ''
      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: authHeader(),
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
      expect(res.json().field).toBe('');
    });
  });

  // ─── FC 067 F4 — Finanzas_Cluster_Granularity: 4 Scenarios Gherkin ──────────

  describe('FC 067 F4 — Finanzas_Cluster_Granularity (Cúmulo gastos_egresos)', () => {
    const scopedToken = (userId = 5): string =>
      app.jwt.sign({
        id: userId,
        username: 'scoped.user',
        roleId: 2,
        permissions: ['fleet:scoped', 'finance:dashboard:view:any', 'finance:transaction:create'],
      });

    it('Scenario 1 — Cúmulo SUSPENDED/inactivo → 403 (T1 no visible sin SC+Cúmulo activos)', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }], undefined]) // getUserOwnerIds → [5]
        .mockResolvedValueOnce([
          [{ ownerId: 5, ownerType: 'FLOTILLA', clusterActive: 0 }],
          undefined,
        ]); // T1 ⊤⊥/⊥⊥
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/dashboard',
        headers: { Authorization: `Bearer ${scopedToken()}` },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().code).toBe('FORBIDDEN');
    });

    it('Scenario 2 — Archonaut ve solo su subconjunto de categorías (T2 ⊤) — LEASE/FINE nunca en la query', async () => {
      // FC 082 F2b3a: FINANCE_PERSONAL_CATEGORIES resuelto en UNA query a
      // ids (MAINTENANCE=9102, FUEL=9103, TIRE=9104, REPAIR=9106,
      // TENENCIA=9107, VERIFICACION=9108, OTHER=9109 — mig. 165).
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 7 }], undefined]) // getUserOwnerIds → [7]
        .mockResolvedValueOnce([
          [{ ownerId: 7, ownerType: 'ARCHONAUT', clusterActive: 1 }],
          undefined,
        ])
        .mockResolvedValueOnce([
          [
            { id: 9102, code: 'MAINTENANCE' },
            { id: 9103, code: 'FUEL' },
            { id: 9104, code: 'TIRE' },
            { id: 9106, code: 'REPAIR' },
            { id: 9107, code: 'TENENCIA' },
            { id: 9108, code: 'VERIFICACION' },
            { id: 9109, code: 'OTHER' },
          ],
          undefined,
        ]) // resolveCategoryFilterIds — UNA query para las 7 categorías
        .mockResolvedValueOnce([[], undefined]) // main query
        .mockResolvedValueOnce([[{ total: 0 }], undefined]); // count query
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/transactions',
        headers: { Authorization: `Bearer ${scopedToken(7)}` },
      });
      expect(res.statusCode).toBe(200);
      const mainQueryCall = (db.execute as Mock).mock.calls[3];
      const [sql, params] = mainQueryCall as [string, unknown[]];
      expect(sql).toContain('ft.category_id IN');
      expect(params).toEqual(expect.arrayContaining([9102, 9103, 9107]));
      expect(params).not.toContain(9100); // LEASE
      expect(params).not.toContain(9105); // FINE
    });

    it('Scenario 3 — Tenant de negocio (no Archonaut) ve el set completo (T2 ⊥) — sin filtro de categoría', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }], undefined]) // getUserOwnerIds → [5]
        .mockResolvedValueOnce([
          [{ ownerId: 5, ownerType: 'FLOTILLA', clusterActive: 1 }],
          undefined,
        ])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[{ total: 0 }], undefined]);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/transactions',
        headers: { Authorization: `Bearer ${scopedToken()}` },
      });
      expect(res.statusCode).toBe(200);
      const mainQueryCall = (db.execute as Mock).mock.calls[2];
      const [sql] = mainQueryCall as [string, unknown[]];
      expect(sql).not.toContain('ft.category IN');
    });

    it('Scenario 4 — Aislamiento entre owners: la query sigue exigiendo fu.ownerId IN (ownerScope) tras T1/T2', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }], undefined])
        .mockResolvedValueOnce([
          [{ ownerId: 5, ownerType: 'FLOTILLA', clusterActive: 1 }],
          undefined,
        ])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[{ total: 0 }], undefined]);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/transactions',
        headers: { Authorization: `Bearer ${scopedToken()}` },
      });
      expect(res.statusCode).toBe(200);
      const mainQueryCall = (db.execute as Mock).mock.calls[2];
      const [sql, params] = mainQueryCall as [string, unknown[]];
      expect(sql).toContain('fu.ownerId IN');
      expect(params).toContain(5);
    });

    it('POST — Archonaut con categoría fuera de personal_set (LEASE) → 400 VALIDATION_ERROR', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 7 }], undefined]) // getUserOwnerIds → [7]
        .mockResolvedValueOnce([[{ id: 'ARC-001', ownerId: 7 }], undefined]) // unitCheck
        .mockResolvedValueOnce([
          [{ ownerId: 7, ownerType: 'ARCHONAUT', clusterActive: 1 }],
          undefined,
        ]); // gate
      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: { Authorization: `Bearer ${scopedToken(7)}` },
        payload: { unitId: 'ARC-001', category: 'LEASE', amount: 500 },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('VALIDATION_ERROR');
      expect(res.json().field).toBe('category');
    });

    it('POST — Archonaut con categoría de gasto personal (MAINTENANCE) → 201', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 7 }], undefined])
        .mockResolvedValueOnce([[{ id: 'ARC-001', ownerId: 7 }], undefined])
        .mockResolvedValueOnce([
          [{ ownerId: 7, ownerType: 'ARCHONAUT', clusterActive: 1 }],
          undefined,
        ])
        .mockResolvedValueOnce([[{ id: 9102 }], undefined]) // resolveCatalogId FINANCE_CATEGORY (FC 082 F2b1)
        .mockResolvedValueOnce([[{ id: 9111 }], undefined]) // resolveCatalogId FINANCE_SOURCE (FC 082 F2b1)
        .mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, undefined]); // INSERT
      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: { Authorization: `Bearer ${scopedToken(7)}` },
        payload: { unitId: 'ARC-001', category: 'MAINTENANCE', amount: 500 },
      });
      expect(res.statusCode).toBe(201);
    });

    it('POST — Cúmulo inactivo para el owner de la unidad → 403 antes de insertar', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }], undefined])
        .mockResolvedValueOnce([[{ id: 'ASM-001', ownerId: 5 }], undefined])
        .mockResolvedValueOnce([
          [{ ownerId: 5, ownerType: 'FLOTILLA', clusterActive: 0 }],
          undefined,
        ]);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: { Authorization: `Bearer ${scopedToken()}` },
        payload: { unitId: 'ASM-001', category: 'FUEL', amount: 500 },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().code).toBe('FORBIDDEN');
    });

    it('POST — unidad pertenece a un owner fuera del scope → 403 (Unidad fuera de los propietarios permitidos)', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }], undefined]) // getUserOwnerIds → [5]
        .mockResolvedValueOnce([[{ id: 'ASM-999', ownerId: 99 }], undefined]) // unidad es de owner 99
        .mockResolvedValueOnce([
          [{ ownerId: 5, ownerType: 'FLOTILLA', clusterActive: 1 }],
          undefined,
        ]); // Cúmulo activo para el owner 5 (no forbidden), pero 99 no está en el scope
      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: { Authorization: `Bearer ${scopedToken()}` },
        payload: { unitId: 'ASM-999', category: 'FUEL', amount: 500 },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().code).toBe('FORBIDDEN');
      expect(res.json().message).toBe('Unidad fuera de los propietarios permitidos');
    });
  });
});

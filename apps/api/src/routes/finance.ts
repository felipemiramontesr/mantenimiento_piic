import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';
import db from '../services/db';
import { UNIT_STATUS } from '../constants/statuses';
import requirePermission from '../middleware/requirePermission';
import FleetService from '../services/fleetService';
import { resolveFinanceClusterScope } from '../services/clusterAccess';
import { resolveCatalogId, CatalogMappingError } from '../services/catalogMapper';

const resolveOwnerScope = async (request: FastifyRequest): Promise<number[] | null> => {
  const { id, permissions } = request.user as { id: number; permissions?: string[] };
  if (!permissions || permissions.includes('*') || !permissions.includes('fleet:scoped'))
    return null;
  return FleetService.getUserOwnerIds(id);
};

/**
 * FC 067 F4 — T1 (Cúmulo gastos_egresos activo) + T2 (scope Archonaut).
 * Solo se evalúa cuando ownerScope es un array no vacío (ownerScope=null es
 * Ω/admin, sin restricción de Cúmulo — §24.5; ownerScope=[] ya retornó antes).
 */
async function gateFinanceCluster(
  ownerScope: number[]
): Promise<
  | { forbidden: true }
  | { forbidden: false; ownerIds: number[]; categoryFilter: readonly string[] | null }
> {
  const { activeOwnerIds, categoryFilter } = await resolveFinanceClusterScope(ownerScope);
  if (activeOwnerIds.length === 0) {
    return { forbidden: true };
  }
  return { forbidden: false, ownerIds: activeOwnerIds, categoryFilter };
}

function appendCategoryFilter(
  query: string,
  params: (string | number)[],
  categoryFilter: readonly string[] | null
): string {
  if (!categoryFilter) return query;
  params.push(...categoryFilter);
  return `${query} AND ft.category IN (${categoryFilter.map(() => '?').join(', ')})`;
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export const FINANCE_CATEGORY_ENUM = [
  'LEASE',
  'INSURANCE',
  'MAINTENANCE',
  'FUEL',
  'TIRE',
  'FINE',
  'REPAIR',
  'TENENCIA',
  'VERIFICACION',
  'OTHER',
] as const;

// ─── Pure helpers (exported for unit tests) ───────────────────────────────────

export function computePeriod(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export type CsvTransaction = {
  uuid: string;
  unit_name: string;
  category: string;
  amount: number;
  period: string;
  vendor: string | null;
  invoice_ref: string | null;
  notes: string | null;
  created_by_name: string;
  created_at: string;
};

function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvRow(tx: CsvTransaction): string {
  return [
    tx.uuid,
    tx.unit_name,
    tx.category,
    tx.amount,
    tx.period,
    escapeCsvField(tx.vendor),
    escapeCsvField(tx.invoice_ref),
    escapeCsvField(tx.notes),
    escapeCsvField(tx.created_by_name),
    tx.created_at,
  ].join(',');
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createTransactionSchema = z.object({
  unitId: z.string({ required_error: 'unitId es requerido' }).min(1).max(50),
  category: z.enum(FINANCE_CATEGORY_ENUM, { required_error: 'category es requerido' }),
  amount: z
    .number({ required_error: 'amount es requerido' })
    .positive({ message: 'El monto debe ser mayor a 0' }),
  vendor: z.string().max(150).optional().nullable(),
  invoiceRef: z.string().max(80).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function financeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Sesión requerida' });
    }
  });
  fastify.addHook('preHandler', requirePermission('finance:dashboard:view:any'));

  // GET /v1/finance/dashboard
  fastify.get('/finance/dashboard', async (request, reply) => {
    try {
      const now = new Date();
      const { from, to } = request.query as { from?: string; to?: string };
      const activeFrom = from ?? `${now.getUTCFullYear()}-01`;
      const activeTo = to ?? computePeriod(now);

      // Accept YYYY-MM-DD or YYYY-MM; extract month period for DB queries
      const dateRx = /^\d{4}-\d{2}/;
      if (!dateRx.test(activeFrom) || !dateRx.test(activeTo)) {
        return reply.code(400).send({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Formato inválido. Use YYYY-MM-DD',
          field: 'from/to',
        });
      }
      const fromMonth = activeFrom.substring(0, 7);
      const toMonth = activeTo.substring(0, 7);
      if (fromMonth > toMonth) {
        return reply.code(400).send({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'from debe ser anterior o igual a to',
          field: 'from',
        });
      }

      let ownerScope = await resolveOwnerScope(request);
      if (ownerScope !== null && ownerScope.length === 0) {
        return reply.send({
          success: true,
          data: {
            from: activeFrom,
            to: activeTo,
            kpis: {
              totalEgresos: 0,
              totalLease: 0,
              totalMaintenance: 0,
              totalFuel: 0,
              totalInsurance: 0,
              totalTire: 0,
              totalFine: 0,
              totalRepair: 0,
              totalOther: 0,
              unitCount: 0,
              avgCostPerUnit: 0,
            },
            byCategory: [],
            byMonth: [],
            topUnits: [],
          },
        });
      }

      let categoryFilter: readonly string[] | null = null;
      if (ownerScope !== null) {
        const gate = await gateFinanceCluster(ownerScope);
        if (gate.forbidden) {
          return reply.code(403).send({
            success: false,
            code: 'FORBIDDEN',
            message: 'Cúmulo de Finanzas no disponible para este Universo',
          });
        }
        ownerScope = gate.ownerIds;
        categoryFilter = gate.categoryFilter;
      }

      // FC 082 F2b2 — read-cutover (Cond.3 Bravo): LEFT JOIN + COALESCE en vez
      // de INNER JOIN — si category_id no resolvió (fila huérfana), cae al
      // ENUM crudo en vez de excluir la fila o romper.
      let kpiQuery = `SELECT
          COALESCE(SUM(ft.amount), 0)                                                    AS totalEgresos,
          COALESCE(SUM(CASE WHEN COALESCE(cc.code, ft.category) = 'MAINTENANCE' THEN ft.amount ELSE 0 END), 0) AS totalMaintenance,
          COALESCE(SUM(CASE WHEN COALESCE(cc.code, ft.category) = 'FUEL'        THEN ft.amount ELSE 0 END), 0) AS totalFuel,
          COALESCE(SUM(CASE WHEN COALESCE(cc.code, ft.category) = 'INSURANCE'   THEN ft.amount ELSE 0 END), 0) AS totalInsurance,
          COALESCE(SUM(CASE WHEN COALESCE(cc.code, ft.category) = 'LEASE'       THEN ft.amount ELSE 0 END), 0) AS totalLeaseRegistered,
          COALESCE(SUM(CASE WHEN COALESCE(cc.code, ft.category) = 'TIRE'        THEN ft.amount ELSE 0 END), 0) AS totalTire,
          COALESCE(SUM(CASE WHEN COALESCE(cc.code, ft.category) = 'FINE'        THEN ft.amount ELSE 0 END), 0) AS totalFine,
          COALESCE(SUM(CASE WHEN COALESCE(cc.code, ft.category) = 'REPAIR'      THEN ft.amount ELSE 0 END), 0) AS totalRepair,
          COALESCE(SUM(CASE WHEN COALESCE(cc.code, ft.category) = 'OTHER'       THEN ft.amount ELSE 0 END), 0) AS totalOther
         FROM financial_transactions ft
         JOIN fleet_units fu ON ft.unit_id = fu.id
         LEFT JOIN common_catalogs cc ON cc.id = ft.category_id
         WHERE ft.period >= ? AND ft.period <= ?`;
      const kpiParams: (string | number)[] = [fromMonth, toMonth];
      if (ownerScope !== null) {
        kpiQuery += ` AND fu.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        kpiParams.push(...ownerScope);
      }
      kpiQuery = appendCategoryFilter(kpiQuery, kpiParams, categoryFilter);
      const [kpiRows] = await db.execute<RowDataPacket[]>(kpiQuery, kpiParams);

      let unitQuery = `SELECT COUNT(*) AS unitCount
         FROM fleet_units
         WHERE status != ?`;
      const unitParams: (string | number)[] = [UNIT_STATUS.DISCONTINUED];
      if (ownerScope !== null) {
        unitQuery += ` AND ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        unitParams.push(...ownerScope);
      }
      const [unitRows] = await db.execute<RowDataPacket[]>(unitQuery, unitParams);

      let categoryQuery = `SELECT COALESCE(cc.code, ft.category) AS category, SUM(ft.amount) AS amount
         FROM financial_transactions ft
         JOIN fleet_units fu ON ft.unit_id = fu.id
         LEFT JOIN common_catalogs cc ON cc.id = ft.category_id
         WHERE ft.period >= ? AND ft.period <= ?`;
      const categoryParams: (string | number)[] = [fromMonth, toMonth];
      if (ownerScope !== null) {
        categoryQuery += ` AND fu.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        categoryParams.push(...ownerScope);
      }
      categoryQuery = appendCategoryFilter(categoryQuery, categoryParams, categoryFilter);
      categoryQuery += ` GROUP BY COALESCE(cc.code, ft.category) ORDER BY amount DESC`;
      const [categoryRows] = await db.execute<RowDataPacket[]>(categoryQuery, categoryParams);

      let monthQuery = `SELECT ft.period, COALESCE(SUM(ft.amount), 0) AS amount
         FROM financial_transactions ft
         JOIN fleet_units fu ON ft.unit_id = fu.id
         WHERE ft.period >= ? AND ft.period <= ?`;
      const monthParams: (string | number)[] = [fromMonth, toMonth];
      if (ownerScope !== null) {
        monthQuery += ` AND fu.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        monthParams.push(...ownerScope);
      }
      monthQuery = appendCategoryFilter(monthQuery, monthParams, categoryFilter);
      monthQuery += ` GROUP BY ft.period ORDER BY ft.period ASC`;
      const [monthRows] = await db.execute<RowDataPacket[]>(monthQuery, monthParams);

      let topQuery = `SELECT ft.unit_id AS unitId, SUM(ft.amount) AS amount
         FROM financial_transactions ft
         JOIN fleet_units fu ON ft.unit_id = fu.id
         WHERE ft.period >= ? AND ft.period <= ?`;
      const topParams: (string | number)[] = [fromMonth, toMonth];
      if (ownerScope !== null) {
        topQuery += ` AND fu.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        topParams.push(...ownerScope);
      }
      topQuery = appendCategoryFilter(topQuery, topParams, categoryFilter);
      topQuery += ` GROUP BY ft.unit_id ORDER BY amount DESC LIMIT 5`;
      const [topRows] = await db.execute<RowDataPacket[]>(topQuery, topParams);

      const kpi = kpiRows[0];
      const unitData = unitRows[0];
      const totalEgresos = Number(kpi.totalEgresos);
      const unitCount = Number(unitData.unitCount);

      return reply.send({
        success: true,
        data: {
          from: activeFrom,
          to: activeTo,
          kpis: {
            totalEgresos,
            totalLease: Number(kpi.totalLeaseRegistered),
            totalMaintenance: Number(kpi.totalMaintenance),
            totalFuel: Number(kpi.totalFuel),
            totalInsurance: Number(kpi.totalInsurance),
            totalTire: Number(kpi.totalTire),
            totalFine: Number(kpi.totalFine),
            totalRepair: Number(kpi.totalRepair),
            totalOther: Number(kpi.totalOther),
            unitCount,
            avgCostPerUnit: unitCount > 0 ? totalEgresos / unitCount : 0,
          },
          byCategory: (categoryRows as RowDataPacket[]).map((r) => ({
            category: r.category as string,
            amount: Number(r.amount),
          })),
          byMonth: (monthRows as RowDataPacket[]).map((r) => ({
            period: r.period as string,
            amount: Number(r.amount),
          })),
          topUnits: (topRows as RowDataPacket[]).map((r) => ({
            unitId: r.unitId as string,
            amount: Number(r.amount),
          })),
        },
      });
    } catch (error) {
      fastify.log.error({ err: (error as Error).message }, 'Finance dashboard error');
      return reply.code(500).send({
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Error al obtener datos financieros',
      });
    }
  });

  // GET /v1/finance/transactions
  fastify.get('/finance/transactions', async (request, reply) => {
    try {
      const now = new Date();
      const {
        from,
        to,
        category,
        unitId,
        cursor,
        limit = '50',
      } = request.query as {
        from?: string;
        to?: string;
        category?: string;
        unitId?: string;
        cursor?: string;
        limit?: string;
      };
      const activeFrom = from ?? `${now.getUTCFullYear()}-01-01`;
      const activeTo = to ?? new Date().toISOString().slice(0, 10);
      const fromMonth = activeFrom.substring(0, 7);
      const toMonth = activeTo.substring(0, 7);

      const parsedLimit = Math.min(parseInt(limit, 10) || 50, 200);

      let ownerScope = await resolveOwnerScope(request);
      if (ownerScope !== null && ownerScope.length === 0) {
        return reply.send({
          success: true,
          data: [],
          meta: {
            nextCursor: null,
            total: 0,
          },
        });
      }

      let categoryFilter: readonly string[] | null = null;
      if (ownerScope !== null) {
        const gate = await gateFinanceCluster(ownerScope);
        if (gate.forbidden) {
          return reply.code(403).send({
            success: false,
            code: 'FORBIDDEN',
            message: 'Cúmulo de Finanzas no disponible para este Universo',
          });
        }
        ownerScope = gate.ownerIds;
        categoryFilter = gate.categoryFilter;
      }

      let query = `
        SELECT ft.id, ft.uuid, ft.unit_id, fu.id AS unit_name,
               COALESCE(cc_cat.code, ft.category) AS category, ft.amount, ft.period,
               COALESCE(cc_src.code, ft.source) AS source,
               ft.vendor, ft.invoice_ref, ft.notes,
               u.full_name AS created_by_name, ft.created_at
        FROM financial_transactions ft
        JOIN fleet_units fu ON fu.id = ft.unit_id
        JOIN users u        ON u.id  = ft.created_by
        LEFT JOIN common_catalogs cc_cat ON cc_cat.id = ft.category_id
        LEFT JOIN common_catalogs cc_src ON cc_src.id = ft.source_id
        WHERE ft.period >= ? AND ft.period <= ?
      `;
      const params: (string | number)[] = [fromMonth, toMonth];

      if (ownerScope !== null) {
        query += ` AND fu.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        params.push(...ownerScope);
      }
      query = appendCategoryFilter(query, params, categoryFilter);

      if (category) {
        query += ' AND ft.category = ?';
        params.push(category);
      }
      if (unitId) {
        query += ' AND ft.unit_id = ?';
        params.push(unitId);
      }

      if (cursor) {
        const decoded = Buffer.from(cursor, 'base64').toString('ascii');
        const [cursorDate, cursorId] = decoded.split('|');
        query += ' AND ((ft.created_at < ?) OR (ft.created_at = ? AND ft.id < ?))';
        params.push(cursorDate, cursorDate, parseInt(cursorId, 10));
      }

      query += ' ORDER BY ft.created_at DESC, ft.id DESC LIMIT ?';
      params.push(parsedLimit + 1);

      const [rows] = await db.execute<RowDataPacket[]>(query, params);
      let nextCursor: string | null = null;

      if (rows.length > parsedLimit) {
        const last = rows[parsedLimit - 1];
        nextCursor = Buffer.from(`${(last.created_at as Date).toISOString()}|${last.id}`).toString(
          'base64'
        );
        rows.pop();
      }

      let countQuery = `SELECT COUNT(*) AS total
         FROM financial_transactions ft
         JOIN fleet_units fu ON fu.id = ft.unit_id
         WHERE ft.period >= ? AND ft.period <= ?`;
      const countParams: (string | number)[] = [fromMonth, toMonth];
      if (ownerScope !== null) {
        countQuery += ` AND fu.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        countParams.push(...ownerScope);
      }
      countQuery = appendCategoryFilter(countQuery, countParams, categoryFilter);
      if (category) {
        countQuery += ' AND ft.category = ?';
        countParams.push(category);
      }
      if (unitId) {
        countQuery += ' AND ft.unit_id = ?';
        countParams.push(unitId);
      }

      const [countRows] = await db.execute<RowDataPacket[]>(countQuery, countParams);

      return reply.send({
        success: true,
        data: rows,
        meta: {
          nextCursor,
          total: Number((countRows[0] as RowDataPacket).total),
        },
      });
    } catch (error) {
      fastify.log.error({ err: (error as Error).message }, 'Finance transactions list error');
      return reply.code(500).send({
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Error al obtener transacciones',
      });
    }
  });

  // POST /v1/finance/transactions
  fastify.post(
    '/finance/transactions',
    { preHandler: [requirePermission('finance:transaction:create')] },
    async (request, reply) => {
      const parsed = createTransactionSchema.safeParse(request.body);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return reply.code(400).send({
          success: false,
          code: 'VALIDATION_ERROR',
          message: first.message,
          field: String(first.path[0] ?? ''),
        });
      }

      const { unitId, category, amount, vendor, invoiceRef, notes } = parsed.data;
      const uuid = crypto.randomUUID();
      const period = computePeriod(new Date());
      const createdBy = (request.user as { id: number }).id;

      try {
        let ownerScope = await resolveOwnerScope(request);
        const [unitCheck] = await db.execute<RowDataPacket[]>(
          'SELECT id, ownerId FROM fleet_units WHERE id = ?',
          [unitId]
        );
        if (unitCheck.length === 0) {
          return reply
            .code(404)
            .send({ success: false, code: 'NOT_FOUND', message: 'Unidad no encontrada' });
        }

        let categoryFilter: readonly string[] | null = null;
        if (ownerScope !== null) {
          const gate = await gateFinanceCluster(ownerScope);
          if (gate.forbidden) {
            return reply.code(403).send({
              success: false,
              code: 'FORBIDDEN',
              message: 'Cúmulo de Finanzas no disponible para este Universo',
            });
          }
          ownerScope = gate.ownerIds;
          categoryFilter = gate.categoryFilter;
        }
        if (ownerScope !== null && !ownerScope.includes(unitCheck[0].ownerId)) {
          return reply.code(403).send({
            success: false,
            code: 'FORBIDDEN',
            message: 'Unidad fuera de los propietarios permitidos',
          });
        }
        if (categoryFilter && !categoryFilter.includes(category)) {
          return reply.code(400).send({
            success: false,
            code: 'VALIDATION_ERROR',
            message: 'Categoría no permitida para este tipo de Universo',
            field: 'category',
          });
        }

        // FC 082 F2b1 — dual-write (Cond.2): category/source siguen siendo la
        // fuente de verdad (ENUM intacto hasta F2b2); category_id/source_id
        // se escriben en paridad para cerrar el drift de Cond.3.
        const categoryId = await resolveCatalogId('FINANCE_CATEGORY', category);
        const sourceId = await resolveCatalogId('FINANCE_SOURCE', 'MANUAL');

        await db.execute<ResultSetHeader>(
          `INSERT INTO financial_transactions
           (uuid, unit_id, category, category_id, amount, period, source, source_id, vendor, invoice_ref, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'MANUAL', ?, ?, ?, ?, ?)`,
          [
            uuid,
            unitId,
            category,
            categoryId,
            amount,
            period,
            sourceId,
            vendor ?? null,
            invoiceRef ?? null,
            notes ?? null,
            createdBy,
          ]
        );

        return reply.code(201).send({ success: true, data: { uuid } });
      } catch (error) {
        if (error instanceof CatalogMappingError) {
          return reply.code(400).send({
            success: false,
            code: 'VALIDATION_ERROR',
            message: 'Categoría no catalogada',
            field: 'category',
          });
        }
        fastify.log.error({ err: (error as Error).message }, 'Finance create transaction error');
        return reply.code(500).send({
          success: false,
          code: 'INTERNAL_ERROR',
          message: 'Error al registrar transacción',
        });
      }
    }
  );

  // GET /v1/finance/export
  fastify.get('/finance/export', async (request, reply) => {
    try {
      const now = new Date();
      const { from, to, category } = request.query as {
        from?: string;
        to?: string;
        category?: string;
      };
      const activeFrom = from ?? `${now.getUTCFullYear()}-01-01`;
      const activeTo = to ?? new Date().toISOString().slice(0, 10);
      const fromMonth = activeFrom.substring(0, 7);
      const toMonth = activeTo.substring(0, 7);

      let ownerScope = await resolveOwnerScope(request);
      if (ownerScope !== null && ownerScope.length === 0) {
        reply.header('Content-Type', 'text/csv; charset=utf-8');
        reply.header(
          'Content-Disposition',
          `attachment; filename="egresos_${activeFrom}_${activeTo}.csv"`
        );
        return reply.send(
          'UUID,Unidad,Categoría,Monto,Período,Proveedor,Referencia,Notas,Registrado por,Fecha'
        );
      }

      let categoryFilter: readonly string[] | null = null;
      if (ownerScope !== null) {
        const gate = await gateFinanceCluster(ownerScope);
        if (gate.forbidden) {
          return reply.code(403).send({
            success: false,
            code: 'FORBIDDEN',
            message: 'Cúmulo de Finanzas no disponible para este Universo',
          });
        }
        ownerScope = gate.ownerIds;
        categoryFilter = gate.categoryFilter;
      }

      let query = `
        SELECT ft.uuid, fu.id AS unit_name, COALESCE(cc.code, ft.category) AS category,
               ft.amount, ft.period,
               ft.vendor, ft.invoice_ref, ft.notes,
               u.full_name AS created_by_name,
               DATE_FORMAT(ft.created_at, '%Y-%m-%d') AS created_at
        FROM financial_transactions ft
        JOIN fleet_units fu ON fu.id = ft.unit_id
        JOIN users u        ON u.id  = ft.created_by
        LEFT JOIN common_catalogs cc ON cc.id = ft.category_id
        WHERE ft.period >= ? AND ft.period <= ?
      `;
      const params: (string | number)[] = [fromMonth, toMonth];

      if (ownerScope !== null) {
        query += ` AND fu.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        params.push(...ownerScope);
      }
      query = appendCategoryFilter(query, params, categoryFilter);

      if (category) {
        query += ' AND ft.category = ?';
        params.push(category);
      }
      query += ' ORDER BY ft.created_at DESC';

      const [rows] = await db.execute<RowDataPacket[]>(query, params);

      const CSV_HEADER =
        'UUID,Unidad,Categoría,Monto,Período,Proveedor,Referencia,Notas,Registrado por,Fecha';
      const csvLines = [CSV_HEADER, ...(rows as CsvTransaction[]).map(buildCsvRow)];
      const csvContent = csvLines.join('\r\n');

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header(
        'Content-Disposition',
        `attachment; filename="egresos_${activeFrom}_${activeTo}.csv"`
      );
      return reply.send(csvContent);
    } catch (error) {
      fastify.log.error({ err: (error as Error).message }, 'Finance export error');
      return reply
        .code(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Error al exportar datos' });
    }
  });
}

export default financeRoutes;

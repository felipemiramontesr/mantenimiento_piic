import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';
import db from '../services/db';
import { UNIT_STATUS } from '../constants/statuses';
import requirePermission from '../middleware/requirePermission';
import FleetService from '../services/fleetService';

const resolveOwnerScope = async (request: FastifyRequest): Promise<number[] | null> => {
  const { id, permissions } = request.user as { id: number; permissions?: string[] };
  if (!permissions || permissions.includes('*') || !permissions.includes('fleet:scoped'))
    return null;
  return FleetService.getUserOwnerIds(id);
};

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
  fastify.addHook('preHandler', requirePermission('financial:view'));

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

      const ownerScope = await resolveOwnerScope(request);
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

      let kpiQuery = `SELECT
          COALESCE(SUM(ft.amount), 0)                                                    AS totalEgresos,
          COALESCE(SUM(CASE WHEN ft.category = 'MAINTENANCE' THEN ft.amount ELSE 0 END), 0) AS totalMaintenance,
          COALESCE(SUM(CASE WHEN ft.category = 'FUEL'        THEN ft.amount ELSE 0 END), 0) AS totalFuel,
          COALESCE(SUM(CASE WHEN ft.category = 'INSURANCE'   THEN ft.amount ELSE 0 END), 0) AS totalInsurance,
          COALESCE(SUM(CASE WHEN ft.category = 'LEASE'       THEN ft.amount ELSE 0 END), 0) AS totalLeaseRegistered,
          COALESCE(SUM(CASE WHEN ft.category = 'TIRE'        THEN ft.amount ELSE 0 END), 0) AS totalTire,
          COALESCE(SUM(CASE WHEN ft.category = 'FINE'        THEN ft.amount ELSE 0 END), 0) AS totalFine,
          COALESCE(SUM(CASE WHEN ft.category = 'REPAIR'      THEN ft.amount ELSE 0 END), 0) AS totalRepair,
          COALESCE(SUM(CASE WHEN ft.category = 'OTHER'       THEN ft.amount ELSE 0 END), 0) AS totalOther
         FROM financial_transactions ft
         JOIN fleet_units fu ON ft.unit_id = fu.id
         WHERE ft.period >= ? AND ft.period <= ?`;
      const kpiParams: (string | number)[] = [fromMonth, toMonth];
      if (ownerScope !== null) {
        kpiQuery += ` AND fu.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        kpiParams.push(...ownerScope);
      }
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

      let categoryQuery = `SELECT ft.category, SUM(ft.amount) AS amount
         FROM financial_transactions ft
         JOIN fleet_units fu ON ft.unit_id = fu.id
         WHERE ft.period >= ? AND ft.period <= ?`;
      const categoryParams: (string | number)[] = [fromMonth, toMonth];
      if (ownerScope !== null) {
        categoryQuery += ` AND fu.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        categoryParams.push(...ownerScope);
      }
      categoryQuery += ` GROUP BY ft.category ORDER BY amount DESC`;
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

      const ownerScope = await resolveOwnerScope(request);
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

      let query = `
        SELECT ft.id, ft.uuid, ft.unit_id, fu.id AS unit_name,
               ft.category, ft.amount, ft.period, ft.source,
               ft.vendor, ft.invoice_ref, ft.notes,
               u.full_name AS created_by_name, ft.created_at
        FROM financial_transactions ft
        JOIN fleet_units fu ON fu.id = ft.unit_id
        JOIN users u        ON u.id  = ft.created_by
        WHERE ft.period >= ? AND ft.period <= ?
      `;
      const params: (string | number)[] = [fromMonth, toMonth];

      if (ownerScope !== null) {
        query += ` AND fu.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        params.push(...ownerScope);
      }

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
    { preHandler: [requirePermission('financial:write')] },
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
        const ownerScope = await resolveOwnerScope(request);
        const [unitCheck] = await db.execute<RowDataPacket[]>(
          'SELECT id, ownerId FROM fleet_units WHERE id = ?',
          [unitId]
        );
        if (unitCheck.length === 0) {
          return reply
            .code(404)
            .send({ success: false, code: 'NOT_FOUND', message: 'Unidad no encontrada' });
        }
        if (ownerScope !== null && !ownerScope.includes(unitCheck[0].ownerId)) {
          return reply.code(403).send({
            success: false,
            code: 'FORBIDDEN',
            message: 'Unidad fuera de los propietarios permitidos',
          });
        }

        await db.execute<ResultSetHeader>(
          `INSERT INTO financial_transactions
           (uuid, unit_id, category, amount, period, source, vendor, invoice_ref, notes, created_by)
         VALUES (?, ?, ?, ?, ?, 'MANUAL', ?, ?, ?, ?)`,
          [
            uuid,
            unitId,
            category,
            amount,
            period,
            vendor ?? null,
            invoiceRef ?? null,
            notes ?? null,
            createdBy,
          ]
        );

        return reply.code(201).send({ success: true, data: { uuid } });
      } catch (error) {
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

      const ownerScope = await resolveOwnerScope(request);
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

      let query = `
        SELECT ft.uuid, fu.id AS unit_name, ft.category, ft.amount, ft.period,
               ft.vendor, ft.invoice_ref, ft.notes,
               u.full_name AS created_by_name,
               DATE_FORMAT(ft.created_at, '%Y-%m-%d') AS created_at
        FROM financial_transactions ft
        JOIN fleet_units fu ON fu.id = ft.unit_id
        JOIN users u        ON u.id  = ft.created_by
        WHERE ft.period >= ? AND ft.period <= ?
      `;
      const params: (string | number)[] = [fromMonth, toMonth];

      if (ownerScope !== null) {
        query += ` AND fu.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        params.push(...ownerScope);
      }

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

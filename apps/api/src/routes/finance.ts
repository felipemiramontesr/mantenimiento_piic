import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import requirePermission from '../middleware/requirePermission';
import {
  getDashboard,
  listTransactionsForUser,
  createTransaction,
  exportTransactionsForUser,
  computePeriod,
  FinanceServiceError,
  CatalogMappingError,
  type FinanceUser,
} from '../services/finance.service';

export { computePeriod };

/**
 * FC 138 F1 — Route→Service→Repository. Zero SQL (I1): auth/permission
 * guards + Zod validation + HTTP status/CSV formatting stay here; business
 * logic lives in `services/finance.service.ts`, all SQL in
 * `services/finance.repository.ts` (I3). Handlers extracted to named
 * top-level functions (Gate 1 max-lines-per-function), same pattern as
 * `auth.ts`/`fleetRoutes.ts`.
 */

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

// ─── CSV formatting (HTTP presentation, stays in route) ───────────────────────

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
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

/** Renders one CSV data row for the `/finance/export` download. */
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

const CSV_HEADER =
  'UUID,Unidad,Categoría,Monto,Período,Proveedor,Referencia,Notas,Registrado por,Fecha';

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

function requestUser(request: FastifyRequest): FinanceUser {
  return request.user as FinanceUser;
}

/** Maps `FinanceServiceError.code` to the pre-migration HTTP status/body (Inv-E). */
function sendFinanceServiceError(reply: FastifyReply, error: FinanceServiceError): FastifyReply {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return reply.code(400).send({
        success: false,
        code: 'VALIDATION_ERROR',
        message: error.message,
        field: error.field,
      });
    case 'CATEGORY_FORBIDDEN':
      return reply.code(400).send({
        success: false,
        code: 'VALIDATION_ERROR',
        message: error.message,
        field: 'category',
      });
    case 'UNIT_NOT_FOUND':
      return reply.code(404).send({ success: false, code: 'NOT_FOUND', message: error.message });
    case 'CLUSTER_FORBIDDEN':
    case 'OWNER_FORBIDDEN':
    default:
      return reply.code(403).send({ success: false, code: 'FORBIDDEN', message: error.message });
  }
}

function sendCatalogMappingError(reply: FastifyReply, error: CatalogMappingError): FastifyReply {
  return reply.code(400).send({
    success: false,
    code: 'VALIDATION_ERROR',
    message: error.message,
    field: 'category',
  });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleGetDashboard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { from, to } = request.query as { from?: string; to?: string };
    const data = await getDashboard(requestUser(request), { from, to });
    reply.send({ success: true, data });
  } catch (error) {
    if (error instanceof FinanceServiceError) {
      sendFinanceServiceError(reply, error);
      return;
    }
    if (error instanceof CatalogMappingError) {
      sendCatalogMappingError(reply, error);
      return;
    }
    request.log.error({ err: (error as Error).message }, 'Finance dashboard error');
    reply.code(500).send({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Error al obtener datos financieros',
    });
  }
}

async function handleListTransactions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const query = request.query as {
      from?: string;
      to?: string;
      category?: string;
      unitId?: string;
      cursor?: string;
      limit?: string;
    };
    const result = await listTransactionsForUser(requestUser(request), query);
    reply.send({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    if (error instanceof FinanceServiceError) {
      sendFinanceServiceError(reply, error);
      return;
    }
    if (error instanceof CatalogMappingError) {
      sendCatalogMappingError(reply, error);
      return;
    }
    request.log.error({ err: (error as Error).message }, 'Finance transactions list error');
    reply.code(500).send({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Error al obtener transacciones',
    });
  }
}

function sendCreateTransactionError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown
): void {
  if (error instanceof FinanceServiceError) {
    sendFinanceServiceError(reply, error);
    return;
  }
  if (error instanceof CatalogMappingError) {
    reply.code(400).send({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Categoría no catalogada',
      field: 'category',
    });
    return;
  }
  request.log.error({ err: (error as Error).message }, 'Finance create transaction error');
  reply.code(500).send({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Error al registrar transacción',
  });
}

async function handleCreateTransaction(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parsed = createTransactionSchema.safeParse(request.body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    reply.code(400).send({
      success: false,
      code: 'VALIDATION_ERROR',
      message: first.message,
      field: String(first.path[0] ?? ''),
    });
    return;
  }

  const { unitId, category, amount, vendor, invoiceRef, notes } = parsed.data;
  const uuid = crypto.randomUUID();
  const period = computePeriod(new Date());
  const createdBy = (request.user as { id: number }).id;

  try {
    const result = await createTransaction(
      requestUser(request),
      {
        unitId,
        category,
        amount,
        vendor: vendor ?? null,
        invoiceRef: invoiceRef ?? null,
        notes: notes ?? null,
      },
      { uuid, period, createdBy }
    );
    reply.code(201).send({ success: true, data: result });
  } catch (error) {
    sendCreateTransactionError(request, reply, error);
  }
}

async function handleExport(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const query = request.query as { from?: string; to?: string; category?: string };
    const activeFrom = query.from ?? `${new Date().getUTCFullYear()}-01-01`;
    const activeTo = query.to ?? new Date().toISOString().slice(0, 10);
    const rows = await exportTransactionsForUser(requestUser(request), query);

    const csvLines = [CSV_HEADER, ...rows.map((r) => buildCsvRow(r as unknown as CsvTransaction))];
    const csvContent = csvLines.join('\r\n');

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header(
      'Content-Disposition',
      `attachment; filename="egresos_${activeFrom}_${activeTo}.csv"`
    );
    reply.send(csvContent);
  } catch (error) {
    if (error instanceof FinanceServiceError) {
      sendFinanceServiceError(reply, error);
      return;
    }
    if (error instanceof CatalogMappingError) {
      sendCatalogMappingError(reply, error);
      return;
    }
    request.log.error({ err: (error as Error).message }, 'Finance export error');
    reply
      .code(500)
      .send({ success: false, code: 'INTERNAL_ERROR', message: 'Error al exportar datos' });
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** Registers the 4 `/finance/*` endpoints — JWT + permission guards, zero SQL (I1). */
export async function financeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Sesión requerida' });
    }
  });
  fastify.addHook('preHandler', requirePermission('finance:dashboard:view:any'));

  fastify.get('/finance/dashboard', handleGetDashboard);
  fastify.get('/finance/transactions', handleListTransactions);
  fastify.post(
    '/finance/transactions',
    { preHandler: [requirePermission('finance:transaction:create')] },
    handleCreateTransaction
  );
  fastify.get('/finance/export', handleExport);
}

export default financeRoutes;

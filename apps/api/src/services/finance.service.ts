import { RowDataPacket } from 'mysql2';
import { resolveOwnerScope as resolveScope } from './ownerScopeResolver';
import { resolveFinanceClusterScope } from './clusterAccess';
import { resolveCatalogId, CatalogMappingError } from './catalogMapper';
import * as FinanceRepository from './finance.repository';
import { FinanceServiceError } from './finance.errors';

/**
 * FC 138 F1 — FinanceService: orchestration only, zero SQL, zero Fastify
 * (invariants I1/I2). Resolves the caller's owner scope via the shared
 * `ownerScopeResolver.ts` SSOT (Cond.R-138-H2 — no local copy) and delegates
 * all persistence to `finance.repository.ts` (I3). Call order per endpoint
 * is preserved verbatim from the pre-migration `routes/finance.ts` so the
 * existing `financeIntegration.test.ts` mock-call-order assertions keep
 * passing unmodified.
 */
export { CatalogMappingError, FinanceServiceError };

export interface FinanceUser {
  id: number;
  permissions?: string[];
  tenant_id?: number | null;
}

/** Defaults a missing `to` boundary to the caller's current YYYY-MM period. */
export function computePeriod(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Cond.R-138-H2 — delegates exclusively to the ownerScopeResolver.ts SSOT. */
export function resolveOwnerScope(user: FinanceUser): Promise<number[] | null> {
  return resolveScope(user);
}

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

/** Throws `FinanceServiceError('CLUSTER_FORBIDDEN')`; narrows `ownerScope`/`categoryFilter` in place. */
async function applyClusterGate(
  ownerScope: number[]
): Promise<{ ownerScope: number[]; categoryFilter: readonly string[] | null }> {
  const gate = await gateFinanceCluster(ownerScope);
  if (gate.forbidden) {
    throw new FinanceServiceError(
      'CLUSTER_FORBIDDEN',
      'Cúmulo de Finanzas no disponible para este Universo'
    );
  }
  return { ownerScope: gate.ownerIds, categoryFilter: gate.categoryFilter };
}

async function resolveCategoryFilterIds(
  categoryFilter: readonly string[] | null
): Promise<number[] | null> {
  if (!categoryFilter) return null;
  const rows = await FinanceRepository.findCatalogIdsByCode(categoryFilter);
  if (rows.length !== categoryFilter.length) {
    const foundCodes = new Set(rows.map((r) => r.code));
    const missing = categoryFilter.find((code) => !foundCodes.has(code));
    if (missing) throw new CatalogMappingError('FINANCE_CATEGORY', missing);
  }
  return rows.map((r) => r.id);
}

type ScopeContext =
  | { empty: true }
  | { empty: false; ownerScope: number[] | null; categoryFilterIds: number[] | null };

/**
 * Shared preamble for dashboard/transactions-list/export: resolve owner
 * scope, short-circuit on an empty scoped array, apply the Finance Cúmulo
 * gate, and resolve the category filter to catalog ids. Extracted to keep
 * each endpoint function under the Gate 1 max-lines-per-function budget.
 */
async function resolveScopeContext(user: FinanceUser): Promise<ScopeContext> {
  let ownerScope = await resolveOwnerScope(user);
  if (ownerScope !== null && ownerScope.length === 0) {
    return { empty: true };
  }
  let categoryFilter: readonly string[] | null = null;
  if (ownerScope !== null) {
    const gated = await applyClusterGate(ownerScope);
    ownerScope = gated.ownerScope;
    categoryFilter = gated.categoryFilter;
  }
  const categoryFilterIds = await resolveCategoryFilterIds(categoryFilter);
  return { empty: false, ownerScope, categoryFilterIds };
}

function validateDateRange(
  from: string | undefined,
  to: string | undefined,
  now: Date
): { activeFrom: string; activeTo: string; fromMonth: string; toMonth: string } {
  const activeFrom = from ?? `${now.getUTCFullYear()}-01`;
  const activeTo = to ?? computePeriod(now);
  const dateRx = /^\d{4}-\d{2}/;
  if (!dateRx.test(activeFrom) || !dateRx.test(activeTo)) {
    throw new FinanceServiceError(
      'VALIDATION_ERROR',
      'Formato inválido. Use YYYY-MM-DD',
      'from/to'
    );
  }
  const fromMonth = activeFrom.substring(0, 7);
  const toMonth = activeTo.substring(0, 7);
  if (fromMonth > toMonth) {
    throw new FinanceServiceError(
      'VALIDATION_ERROR',
      'from debe ser anterior o igual a to',
      'from'
    );
  }
  return { activeFrom, activeTo, fromMonth, toMonth };
}

export interface DashboardKpis {
  totalEgresos: number;
  totalLease: number;
  totalMaintenance: number;
  totalFuel: number;
  totalInsurance: number;
  totalTire: number;
  totalFine: number;
  totalRepair: number;
  totalOther: number;
  unitCount: number;
  avgCostPerUnit: number;
}

export interface DashboardResult {
  from: string;
  to: string;
  kpis: DashboardKpis;
  byCategory: { category: string; amount: number }[];
  byMonth: { period: string; amount: number }[];
  topUnits: { unitId: string; amount: number }[];
}

const ZERO_KPIS: DashboardKpis = {
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
};

function buildDashboardResult(
  activeFrom: string,
  activeTo: string,
  kpiRows: RowDataPacket[],
  unitRows: RowDataPacket[],
  categoryRows: RowDataPacket[],
  monthRows: RowDataPacket[],
  topRows: RowDataPacket[]
): DashboardResult {
  const kpi = kpiRows[0];
  const totalEgresos = Number(kpi.totalEgresos);
  const unitCount = Number(unitRows[0].unitCount);
  return {
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
    byCategory: categoryRows.map((r) => ({
      category: r.category as string,
      amount: Number(r.amount),
    })),
    byMonth: monthRows.map((r) => ({ period: r.period as string, amount: Number(r.amount) })),
    topUnits: topRows.map((r) => ({ unitId: r.unitId as string, amount: Number(r.amount) })),
  };
}

/** Orchestrates `GET /finance/dashboard` — KPIs + breakdowns for the caller's owner scope. */
export async function getDashboard(
  user: FinanceUser,
  params: { from?: string; to?: string }
): Promise<DashboardResult> {
  const { activeFrom, activeTo, fromMonth, toMonth } = validateDateRange(
    params.from,
    params.to,
    new Date()
  );

  const scope = await resolveScopeContext(user);
  if (scope.empty) {
    return {
      from: activeFrom,
      to: activeTo,
      kpis: ZERO_KPIS,
      byCategory: [],
      byMonth: [],
      topUnits: [],
    };
  }

  const filter = {
    fromMonth,
    toMonth,
    ownerScope: scope.ownerScope,
    categoryFilterIds: scope.categoryFilterIds,
  };
  const kpiRows = await FinanceRepository.getDashboardKpis(filter);
  const unitRows = await FinanceRepository.getActiveUnitCount(scope.ownerScope);
  const categoryRows = await FinanceRepository.getCategoryBreakdown(filter);
  const monthRows = await FinanceRepository.getMonthlyBreakdown(filter);
  const topRows = await FinanceRepository.getTopUnits(filter);

  return buildDashboardResult(
    activeFrom,
    activeTo,
    kpiRows,
    unitRows,
    categoryRows,
    monthRows,
    topRows
  );
}

export interface TransactionsListParams {
  from?: string;
  to?: string;
  category?: string;
  unitId?: string;
  cursor?: string;
  limit?: string;
}

export interface TransactionsListResult {
  data: unknown[];
  meta: { nextCursor: string | null; total: number };
}

/** Cursor-paginates `rows` at `limit` — mirrors the pre-migration inline logic, without mutating `rows`. */
function paginateRows<T extends RowDataPacket>(
  rows: T[],
  limit: number
): { data: T[]; nextCursor: string | null } {
  if (rows.length <= limit) return { data: rows, nextCursor: null };
  const last = rows[limit - 1];
  const nextCursor = Buffer.from(`${(last.created_at as Date).toISOString()}|${last.id}`).toString(
    'base64'
  );
  return { data: rows.slice(0, limit), nextCursor };
}

/** Orchestrates `GET /finance/transactions` — cursor-paginated listing for the caller's owner scope. */
export async function listTransactionsForUser(
  user: FinanceUser,
  params: TransactionsListParams
): Promise<TransactionsListResult> {
  const now = new Date();
  const activeFrom = params.from ?? `${now.getUTCFullYear()}-01-01`;
  const activeTo = params.to ?? new Date().toISOString().slice(0, 10);
  const fromMonth = activeFrom.substring(0, 7);
  const toMonth = activeTo.substring(0, 7);
  const parsedLimit = Math.min(Number.parseInt(params.limit ?? '50', 10) || 50, 200);

  const scope = await resolveScopeContext(user);
  if (scope.empty) {
    return { data: [], meta: { nextCursor: null, total: 0 } };
  }
  const categoryIdFilter = params.category
    ? await resolveCatalogId('FINANCE_CATEGORY', params.category)
    : null;

  const rows = await FinanceRepository.listTransactions({
    fromMonth,
    toMonth,
    ownerScope: scope.ownerScope,
    categoryFilterIds: scope.categoryFilterIds,
    categoryIdFilter,
    unitId: params.unitId,
    cursor: params.cursor,
    limit: parsedLimit,
  });
  const { data, nextCursor } = paginateRows(rows, parsedLimit);

  const countRows = await FinanceRepository.countTransactions({
    fromMonth,
    toMonth,
    ownerScope: scope.ownerScope,
    categoryFilterIds: scope.categoryFilterIds,
    categoryIdFilter,
    unitId: params.unitId,
  });

  return { data, meta: { nextCursor, total: Number(countRows[0].total) } };
}

export interface CreateTransactionInput {
  unitId: string;
  category: string;
  amount: number;
  vendor: string | null;
  invoiceRef: string | null;
  notes: string | null;
}

/** Orchestrates `POST /finance/transactions` — validates scope/Cúmulo/category, then inserts. */
export async function createTransaction(
  user: FinanceUser,
  input: CreateTransactionInput,
  identity: { uuid: string; period: string; createdBy: number }
): Promise<{ uuid: string }> {
  let ownerScope = await resolveOwnerScope(user);
  const unitRows = await FinanceRepository.findUnitOwner(input.unitId);
  if (unitRows.length === 0) {
    throw new FinanceServiceError('UNIT_NOT_FOUND', 'Unidad no encontrada');
  }

  let categoryFilter: readonly string[] | null = null;
  if (ownerScope !== null) {
    const gated = await applyClusterGate(ownerScope);
    ownerScope = gated.ownerScope;
    categoryFilter = gated.categoryFilter;
  }
  if (ownerScope !== null && !ownerScope.includes(unitRows[0].ownerId)) {
    throw new FinanceServiceError('OWNER_FORBIDDEN', 'Unidad fuera de los propietarios permitidos');
  }
  if (categoryFilter && !categoryFilter.includes(input.category)) {
    throw new FinanceServiceError(
      'CATEGORY_FORBIDDEN',
      'Categoría no permitida para este tipo de Universo',
      'category'
    );
  }

  const categoryId = await resolveCatalogId('FINANCE_CATEGORY', input.category);
  const sourceId = await resolveCatalogId('FINANCE_SOURCE', 'MANUAL');

  await FinanceRepository.insertTransaction({
    uuid: identity.uuid,
    unitId: input.unitId,
    categoryId,
    amount: input.amount,
    period: identity.period,
    sourceId,
    vendor: input.vendor,
    invoiceRef: input.invoiceRef,
    notes: input.notes,
    createdBy: identity.createdBy,
  });

  return { uuid: identity.uuid };
}

export interface ExportParams {
  from?: string;
  to?: string;
  category?: string;
}

/** Orchestrates `GET /finance/export` — same scope/Cúmulo resolution, returns raw CSV-source rows. */
export async function exportTransactionsForUser(
  user: FinanceUser,
  params: ExportParams
): Promise<FinanceRepository.ExportTransactionRow[]> {
  const now = new Date();
  const activeFrom = params.from ?? `${now.getUTCFullYear()}-01-01`;
  const activeTo = params.to ?? new Date().toISOString().slice(0, 10);
  const fromMonth = activeFrom.substring(0, 7);
  const toMonth = activeTo.substring(0, 7);

  const scope = await resolveScopeContext(user);
  if (scope.empty) {
    return [];
  }
  const categoryIdFilter = params.category
    ? await resolveCatalogId('FINANCE_CATEGORY', params.category)
    : null;

  return FinanceRepository.exportTransactions({
    fromMonth,
    toMonth,
    ownerScope: scope.ownerScope,
    categoryFilterIds: scope.categoryFilterIds,
    categoryIdFilter,
  });
}

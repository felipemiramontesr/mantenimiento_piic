import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';
import { UNIT_STATUS } from '../constants/statuses';

/**
 * FC 138 F1 — FinanceRepository: the single SQL boundary for the finance
 * domain (invariant I3). All 11 call-sites migrated verbatim from
 * `routes/finance.ts` (Inv-E — same params/results as pre-migration).
 * `ownerScope`/`categoryFilterIds` are business-resolved upstream in
 * `finance.service.ts` — this file only turns them into parametrized SQL.
 */
export interface DateRangeFilter {
  fromMonth: string;
  toMonth: string;
  ownerScope: number[] | null;
  categoryFilterIds: readonly number[] | null;
}

function appendCategoryFilter(
  query: string,
  params: (string | number)[],
  categoryFilterIds: readonly number[] | null
): string {
  if (!categoryFilterIds) return query;
  params.push(...categoryFilterIds);
  return `${query} AND ft.category_id IN (${categoryFilterIds.map(() => '?').join(', ')})`;
}

function appendOwnerScope(
  query: string,
  params: (string | number)[],
  ownerScope: number[] | null,
  alias = 'fu'
): string {
  if (ownerScope === null) return query;
  params.push(...ownerScope);
  const column = alias ? `${alias}.ownerId` : 'ownerId';
  return `${query} AND ${column} IN (${ownerScope.map(() => '?').join(', ')})`;
}

export interface CatalogIdCodeRow extends RowDataPacket {
  id: number;
  code: string;
}

/** call-site 1 — resolveCategoryFilterIds's catalog lookup. */
export async function findCatalogIdsByCode(codes: readonly string[]): Promise<CatalogIdCodeRow[]> {
  const placeholders = codes.map(() => '?').join(', ');
  const [rows] = await db.execute<CatalogIdCodeRow[]>(
    `SELECT id, code FROM common_catalogs WHERE category = 'FINANCE_CATEGORY' AND code IN (${placeholders})`,
    [...codes]
  );
  return rows;
}

/** call-site 2 — GET /finance/dashboard KPI aggregates. */
export async function getDashboardKpis(filter: DateRangeFilter): Promise<RowDataPacket[]> {
  let query = `SELECT
      COALESCE(SUM(ft.amount), 0)                                                    AS totalEgresos,
      COALESCE(SUM(CASE WHEN cc.code = 'MAINTENANCE' THEN ft.amount ELSE 0 END), 0) AS totalMaintenance,
      COALESCE(SUM(CASE WHEN cc.code = 'FUEL'        THEN ft.amount ELSE 0 END), 0) AS totalFuel,
      COALESCE(SUM(CASE WHEN cc.code = 'INSURANCE'   THEN ft.amount ELSE 0 END), 0) AS totalInsurance,
      COALESCE(SUM(CASE WHEN cc.code = 'LEASE'       THEN ft.amount ELSE 0 END), 0) AS totalLeaseRegistered,
      COALESCE(SUM(CASE WHEN cc.code = 'TIRE'        THEN ft.amount ELSE 0 END), 0) AS totalTire,
      COALESCE(SUM(CASE WHEN cc.code = 'FINE'        THEN ft.amount ELSE 0 END), 0) AS totalFine,
      COALESCE(SUM(CASE WHEN cc.code = 'REPAIR'      THEN ft.amount ELSE 0 END), 0) AS totalRepair,
      COALESCE(SUM(CASE WHEN cc.code = 'OTHER'       THEN ft.amount ELSE 0 END), 0) AS totalOther
     FROM financial_transactions ft
     JOIN fleet_units fu ON ft.unit_id = fu.id
     LEFT JOIN common_catalogs cc ON cc.id = ft.category_id
     WHERE ft.period >= ? AND ft.period <= ?`;
  const params: (string | number)[] = [filter.fromMonth, filter.toMonth];
  query = appendOwnerScope(query, params, filter.ownerScope);
  query = appendCategoryFilter(query, params, filter.categoryFilterIds);
  const [rows] = await db.execute<RowDataPacket[]>(query, params);
  return rows;
}

/** call-site 3 — GET /finance/dashboard active unit count. */
export async function getActiveUnitCount(ownerScope: number[] | null): Promise<RowDataPacket[]> {
  let query = `SELECT COUNT(*) AS unitCount
     FROM fleet_units
     WHERE status != ?`;
  const params: (string | number)[] = [UNIT_STATUS.DISCONTINUED];
  query = appendOwnerScope(query, params, ownerScope, '');
  const [rows] = await db.execute<RowDataPacket[]>(query, params);
  return rows;
}

/** call-site 4 — GET /finance/dashboard breakdown by category. */
export async function getCategoryBreakdown(filter: DateRangeFilter): Promise<RowDataPacket[]> {
  let query = `SELECT cc.code AS category, SUM(ft.amount) AS amount
     FROM financial_transactions ft
     JOIN fleet_units fu ON ft.unit_id = fu.id
     LEFT JOIN common_catalogs cc ON cc.id = ft.category_id
     WHERE ft.period >= ? AND ft.period <= ?`;
  const params: (string | number)[] = [filter.fromMonth, filter.toMonth];
  query = appendOwnerScope(query, params, filter.ownerScope);
  query = appendCategoryFilter(query, params, filter.categoryFilterIds);
  query += ` GROUP BY cc.code ORDER BY amount DESC`;
  const [rows] = await db.execute<RowDataPacket[]>(query, params);
  return rows;
}

/** call-site 5 — GET /finance/dashboard breakdown by month. */
export async function getMonthlyBreakdown(filter: DateRangeFilter): Promise<RowDataPacket[]> {
  let query = `SELECT ft.period, COALESCE(SUM(ft.amount), 0) AS amount
     FROM financial_transactions ft
     JOIN fleet_units fu ON ft.unit_id = fu.id
     WHERE ft.period >= ? AND ft.period <= ?`;
  const params: (string | number)[] = [filter.fromMonth, filter.toMonth];
  query = appendOwnerScope(query, params, filter.ownerScope);
  query = appendCategoryFilter(query, params, filter.categoryFilterIds);
  query += ` GROUP BY ft.period ORDER BY ft.period ASC`;
  const [rows] = await db.execute<RowDataPacket[]>(query, params);
  return rows;
}

/** call-site 6 — GET /finance/dashboard top 5 units by spend. */
export async function getTopUnits(filter: DateRangeFilter): Promise<RowDataPacket[]> {
  let query = `SELECT ft.unit_id AS unitId, SUM(ft.amount) AS amount
     FROM financial_transactions ft
     JOIN fleet_units fu ON ft.unit_id = fu.id
     WHERE ft.period >= ? AND ft.period <= ?`;
  const params: (string | number)[] = [filter.fromMonth, filter.toMonth];
  query = appendOwnerScope(query, params, filter.ownerScope);
  query = appendCategoryFilter(query, params, filter.categoryFilterIds);
  query += ` GROUP BY ft.unit_id ORDER BY amount DESC LIMIT 5`;
  const [rows] = await db.execute<RowDataPacket[]>(query, params);
  return rows;
}

export interface ListTransactionsFilter extends DateRangeFilter {
  categoryIdFilter: number | null;
  unitId: string | undefined;
  cursor: string | undefined;
  limit: number;
}

/** call-site 7 — GET /finance/transactions paginated listing. */
export async function listTransactions(filter: ListTransactionsFilter): Promise<RowDataPacket[]> {
  let query = `
    SELECT ft.id, ft.uuid, ft.unit_id, fu.id AS unit_name,
           cc_cat.code AS category, ft.amount, ft.period,
           cc_src.code AS source,
           ft.vendor, ft.invoice_ref, ft.notes,
           u.full_name AS created_by_name, ft.created_at
    FROM financial_transactions ft
    JOIN fleet_units fu ON fu.id = ft.unit_id
    JOIN users u        ON u.id  = ft.created_by
    LEFT JOIN common_catalogs cc_cat ON cc_cat.id = ft.category_id
    LEFT JOIN common_catalogs cc_src ON cc_src.id = ft.source_id
    WHERE ft.period >= ? AND ft.period <= ?
  `;
  const params: (string | number)[] = [filter.fromMonth, filter.toMonth];
  query = appendOwnerScope(query, params, filter.ownerScope);
  query = appendCategoryFilter(query, params, filter.categoryFilterIds);

  if (filter.categoryIdFilter !== null) {
    query += ' AND ft.category_id = ?';
    params.push(filter.categoryIdFilter);
  }
  if (filter.unitId) {
    query += ' AND ft.unit_id = ?';
    params.push(filter.unitId);
  }
  if (filter.cursor) {
    const decoded = Buffer.from(filter.cursor, 'base64').toString('ascii');
    const [cursorDate, cursorId] = decoded.split('|');
    query += ' AND ((ft.created_at < ?) OR (ft.created_at = ? AND ft.id < ?))';
    params.push(cursorDate, cursorDate, Number.parseInt(cursorId, 10));
  }

  query += ' ORDER BY ft.created_at DESC, ft.id DESC LIMIT ?';
  params.push(filter.limit + 1);

  const [rows] = await db.execute<RowDataPacket[]>(query, params);
  return rows;
}

export interface CountTransactionsFilter extends DateRangeFilter {
  categoryIdFilter: number | null;
  unitId: string | undefined;
}

/** call-site 8 — GET /finance/transactions total count (pagination meta). */
export async function countTransactions(filter: CountTransactionsFilter): Promise<RowDataPacket[]> {
  let query = `SELECT COUNT(*) AS total
     FROM financial_transactions ft
     JOIN fleet_units fu ON fu.id = ft.unit_id
     WHERE ft.period >= ? AND ft.period <= ?`;
  const params: (string | number)[] = [filter.fromMonth, filter.toMonth];
  query = appendOwnerScope(query, params, filter.ownerScope);
  query = appendCategoryFilter(query, params, filter.categoryFilterIds);
  if (filter.categoryIdFilter !== null) {
    query += ' AND ft.category_id = ?';
    params.push(filter.categoryIdFilter);
  }
  if (filter.unitId) {
    query += ' AND ft.unit_id = ?';
    params.push(filter.unitId);
  }
  const [rows] = await db.execute<RowDataPacket[]>(query, params);
  return rows;
}

export interface UnitOwnerRow extends RowDataPacket {
  id: string;
  ownerId: number;
}

/** call-site 9 — POST /finance/transactions unit existence + owner lookup. */
export async function findUnitOwner(unitId: string): Promise<UnitOwnerRow[]> {
  const [rows] = await db.execute<UnitOwnerRow[]>(
    'SELECT id, ownerId FROM fleet_units WHERE id = ?',
    [unitId]
  );
  return rows;
}

export interface InsertTransactionData {
  uuid: string;
  unitId: string;
  categoryId: number;
  amount: number;
  period: string;
  sourceId: number;
  vendor: string | null;
  invoiceRef: string | null;
  notes: string | null;
  createdBy: number;
}

/** call-site 10 — POST /finance/transactions insert. */
export async function insertTransaction(data: InsertTransactionData): Promise<ResultSetHeader> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO financial_transactions
     (uuid, unit_id, category_id, amount, period, source_id, vendor, invoice_ref, notes, created_by)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.uuid,
      data.unitId,
      data.categoryId,
      data.amount,
      data.period,
      data.sourceId,
      data.vendor,
      data.invoiceRef,
      data.notes,
      data.createdBy,
    ]
  );
  return result;
}

export interface ExportTransactionsFilter extends DateRangeFilter {
  categoryIdFilter: number | null;
}

export interface ExportTransactionRow extends RowDataPacket {
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
}

/** call-site 11 — GET /finance/export CSV rows. */
export async function exportTransactions(
  filter: ExportTransactionsFilter
): Promise<ExportTransactionRow[]> {
  let query = `
    SELECT ft.uuid, fu.id AS unit_name, cc.code AS category,
           ft.amount, ft.period,
           ft.vendor, ft.invoice_ref, ft.notes,
           u.full_name AS created_by_name,
           DATE_FORMAT(ft.created_at, '%Y-%m-%d') AS created_at
    FROM financial_transactions ft
    JOIN fleet_units fu ON ft.unit_id = fu.id
    JOIN users u        ON u.id  = ft.created_by
    LEFT JOIN common_catalogs cc ON cc.id = ft.category_id
    WHERE ft.period >= ? AND ft.period <= ?
  `;
  const params: (string | number)[] = [filter.fromMonth, filter.toMonth];
  query = appendOwnerScope(query, params, filter.ownerScope);
  query = appendCategoryFilter(query, params, filter.categoryFilterIds);
  if (filter.categoryIdFilter !== null) {
    query += ' AND ft.category_id = ?';
    params.push(filter.categoryIdFilter);
  }
  query += ' ORDER BY ft.created_at DESC';
  const [rows] = await db.execute<ExportTransactionRow[]>(query, params);
  return rows;
}

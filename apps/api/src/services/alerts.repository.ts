import { RowDataPacket } from 'mysql2';
import db from './db';

/**
 * FC 094 F3 — AlertsRepository: the single SQL boundary for the alerts domain
 * (invariant I3). `TenantScope.tenantId` follows I4 (`number | null`, `null`
 * only reachable for Ω per T2 of Cond.R-F3-T1..T8 — enforced by the caller in
 * `alerts.service.ts`, not here). `ownerIds` preserves the pre-existing
 * multi-owner mechanism for `fleet:scoped` carriers (T5, `FleetService.
 * getUserOwnerIds`) — a carrier can be linked to more than one owner via
 * `owner_service_links`, which a single `tenantId` cannot express. When
 * `ownerIds` is provided it takes precedence over `tenantId` for that query.
 */
export interface TenantScope {
  tenantId: number | null;
  ownerIds?: number[];
}

const COMPLIANCE_WINDOW_DAYS = 30;
const FINE_WINDOW_DAYS = 7;
const ANOMALY_WINDOW_MONTHS = 6;
const ANOMALY_MIN_HISTORY_PERIODS = 3;
const ANOMALY_RATIO_MEDIUM = 1.5;

interface OwnerFilter {
  clause: string;
  params: number[];
}

/** T4: real join column (`ownerId`) — `alias` lets callers qualify it for joined queries. */
function ownerFilter(scope: TenantScope, alias = ''): OwnerFilter {
  const column = alias ? `${alias}.ownerId` : 'ownerId';
  if (scope.ownerIds !== undefined) {
    if (scope.ownerIds.length === 0) return { clause: '1 = 0', params: [] };
    return {
      clause: `${column} IN (${scope.ownerIds.map(() => '?').join(',')})`,
      params: scope.ownerIds,
    };
  }
  if (scope.tenantId !== null) {
    return { clause: `${column} = ?`, params: [scope.tenantId] };
  }
  return { clause: '1 = 1', params: [] };
}

export interface OverdueUnitRow extends RowDataPacket {
  id: string;
  odometer: number;
  nextServiceReading_forecast: number | null;
  lastServiceDate: unknown;
  maintIntervalDays: unknown;
}

/** Count of fleet units at/past their maintenance-overdue threshold, tenant-scoped. */
export async function countOverdueMaintenance(scope: TenantScope): Promise<number> {
  const { clause, params } = ownerFilter(scope);
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as overdueCount
     FROM fleet_units
     WHERE status != 'Descontinuada'
       AND (
         ((nextServiceReading_forecast IS NOT NULL
           OR (lastServiceReading IS NOT NULL AND maintIntervalKm IS NOT NULL))
          AND odometer >= COALESCE(nextServiceReading_forecast, lastServiceReading + maintIntervalKm) * 0.9)
         OR (lastServiceDate IS NOT NULL
             AND maintIntervalDays IS NOT NULL
             AND DATE_ADD(lastServiceDate, INTERVAL maintIntervalDays DAY)
                 <= DATE_ADD(CURDATE(), INTERVAL 14 DAY))
       )
       AND ${clause}`,
    params
  );
  return Number(rows[0].overdueCount);
}

/** Rows for fleet units at/past their maintenance-overdue threshold, tenant-scoped (LIMIT 50). */
export async function listOverdueMaintenance(scope: TenantScope): Promise<OverdueUnitRow[]> {
  const { clause, params } = ownerFilter(scope);
  const [rows] = await db.execute<OverdueUnitRow[]>(
    `SELECT id, status, odometer,
            COALESCE(nextServiceReading_forecast, lastServiceReading + maintIntervalKm) AS nextServiceReading_forecast,
            lastServiceDate, maintIntervalDays
     FROM fleet_units
     WHERE status != 'Descontinuada'
       AND (
         ((nextServiceReading_forecast IS NOT NULL
           OR (lastServiceReading IS NOT NULL AND maintIntervalKm IS NOT NULL))
          AND odometer >= COALESCE(nextServiceReading_forecast, lastServiceReading + maintIntervalKm) * 0.9)
         OR (lastServiceDate IS NOT NULL
             AND maintIntervalDays IS NOT NULL
             AND DATE_ADD(lastServiceDate, INTERVAL maintIntervalDays DAY)
                 <= DATE_ADD(CURDATE(), INTERVAL 14 DAY))
       )
       AND ${clause}
     LIMIT 50`,
    params
  );
  return rows;
}

export interface IncidentRow extends RowDataPacket {
  id: number;
  category: string;
  description: string;
  reported_at: unknown;
  unit_id: string;
}

/** T4: `route_incidents` has no owner column — join `fleet_movements`→`fleet_units` for it. */
export async function countOpenIncidents(scope: TenantScope): Promise<number> {
  const { clause, params } = ownerFilter(scope, 'fu');
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as incidentCount
     FROM route_incidents i
     JOIN fleet_movements fm ON i.route_uuid = fm.uuid COLLATE utf8mb4_unicode_ci
     JOIN fleet_units fu ON fu.id = fm.unit_id
     WHERE i.status = 'OPEN' AND ${clause}`,
    params
  );
  return Number(rows[0].incidentCount);
}

/** Rows for open route incidents, tenant-scoped via `fleet_movements`→`fleet_units` (LIMIT 50). */
export async function listOpenIncidents(scope: TenantScope): Promise<IncidentRow[]> {
  const { clause, params } = ownerFilter(scope, 'fu');
  const [rows] = await db.execute<IncidentRow[]>(
    `SELECT i.id, cc.code AS category, i.description, i.reported_at, fm.unit_id
     FROM route_incidents i
     JOIN fleet_movements fm ON i.route_uuid = fm.uuid COLLATE utf8mb4_unicode_ci
     JOIN fleet_units fu ON fu.id = fm.unit_id
     LEFT JOIN common_catalogs cc ON cc.id = i.category_id
     WHERE i.status = 'OPEN' AND ${clause}
     ORDER BY i.reported_at DESC
     LIMIT 50`,
    params
  );
  return rows;
}

export interface CriticalUnitRow extends RowDataPacket {
  unit_id: string;
  start_at: unknown;
  hours_active: number;
}

/** Count of units in active maintenance for >48h, tenant-scoped via `fleet_units`. */
export async function countCriticalUnits(scope: TenantScope): Promise<number> {
  const { clause, params } = ownerFilter(scope, 'fu');
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as criticalCount
     FROM fleet_movements fm
     JOIN fleet_units fu ON fu.id = fm.unit_id
     WHERE fm.movement_type = 'MAINTENANCE'
       AND fm.status = 'ACTIVE'
       AND TIMESTAMPDIFF(HOUR, fm.start_at, NOW()) > 48
       AND ${clause}`,
    params
  );
  return Number(rows[0].criticalCount);
}

/** Rows for units in active maintenance for >48h, tenant-scoped (LIMIT 20). */
export async function listCriticalUnits(scope: TenantScope): Promise<CriticalUnitRow[]> {
  const { clause, params } = ownerFilter(scope, 'fu');
  const [rows] = await db.execute<CriticalUnitRow[]>(
    `SELECT fm.uuid, fm.unit_id, fm.start_at,
            TIMESTAMPDIFF(HOUR, fm.start_at, NOW()) AS hours_active
     FROM fleet_movements fm
     JOIN fleet_units fu ON fu.id = fm.unit_id
     WHERE fm.movement_type = 'MAINTENANCE'
       AND fm.status = 'ACTIVE'
       AND TIMESTAMPDIFF(HOUR, fm.start_at, NOW()) > 48
       AND ${clause}
     LIMIT 20`,
    params
  );
  return rows;
}

export interface ComplianceRow extends RowDataPacket {
  id: string;
  insuranceDays: number | null;
  verificationDays: number | null;
  legalDays: number | null;
}

/** Count of compliance documents (insurance/verification/legal) expiring within the window, tenant-scoped. */
export async function countComplianceExpiry(scope: TenantScope): Promise<number> {
  const { clause, params } = ownerFilter(scope);
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT
       SUM(CASE WHEN insuranceExpiryDate IS NOT NULL
                 AND DATEDIFF(insuranceExpiryDate, CURDATE()) <= ${COMPLIANCE_WINDOW_DAYS}
            THEN 1 ELSE 0 END)
     + SUM(CASE WHEN vencimientoVerificacion IS NOT NULL
                 AND DATEDIFF(vencimientoVerificacion, CURDATE()) <= ${COMPLIANCE_WINDOW_DAYS}
            THEN 1 ELSE 0 END)
     + SUM(CASE WHEN legalComplianceDate IS NOT NULL
                 AND DATEDIFF(legalComplianceDate, CURDATE()) <= ${COMPLIANCE_WINDOW_DAYS}
            THEN 1 ELSE 0 END) AS complianceCount
     FROM fleet_units
     WHERE status != 'Descontinuada' AND ${clause}`,
    params
  );
  return Number(rows[0].complianceCount);
}

/** Rows with days-remaining for each compliance document per unit, tenant-scoped (LIMIT 50). */
export async function listComplianceExpiry(scope: TenantScope): Promise<ComplianceRow[]> {
  const { clause, params } = ownerFilter(scope);
  const [rows] = await db.execute<ComplianceRow[]>(
    `SELECT id,
            DATEDIFF(insuranceExpiryDate, CURDATE()) AS insuranceDays,
            DATEDIFF(vencimientoVerificacion, CURDATE()) AS verificationDays,
            DATEDIFF(legalComplianceDate, CURDATE()) AS legalDays
     FROM fleet_units
     WHERE status != 'Descontinuada'
       AND (
         (insuranceExpiryDate IS NOT NULL
          AND DATEDIFF(insuranceExpiryDate, CURDATE()) <= ${COMPLIANCE_WINDOW_DAYS})
         OR (vencimientoVerificacion IS NOT NULL
             AND DATEDIFF(vencimientoVerificacion, CURDATE()) <= ${COMPLIANCE_WINDOW_DAYS})
         OR (legalComplianceDate IS NOT NULL
             AND DATEDIFF(legalComplianceDate, CURDATE()) <= ${COMPLIANCE_WINDOW_DAYS})
       )
       AND ${clause}
     LIMIT 50`,
    params
  );
  return rows;
}

export interface LeaseMissingRow extends RowDataPacket {
  id: string;
  monthlyLeasePayment: number;
  dayOfMonth: number;
}

/** Count of units with a lease payment due but not yet registered this period, tenant-scoped. */
export async function countLeaseMissing(
  scope: TenantScope,
  leaseCategoryId: number
): Promise<number> {
  const { clause, params } = ownerFilter(scope, 'u');
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS leaseMissingCount
     FROM fleet_units u
     WHERE u.status != 'Descontinuada'
       AND u.monthlyLeasePayment IS NOT NULL AND u.monthlyLeasePayment > 0
       AND ${clause}
       AND NOT EXISTS (
         SELECT 1 FROM financial_transactions ft
         WHERE ft.unit_id = u.id AND ft.category_id = ?
           AND ft.period = DATE_FORMAT(CURDATE(), '%Y-%m')
       )`,
    [...params, leaseCategoryId]
  );
  return Number(rows[0].leaseMissingCount);
}

/** Rows for units with a lease payment due but not yet registered this period, tenant-scoped (LIMIT 50). */
export async function listLeaseMissing(
  scope: TenantScope,
  leaseCategoryId: number
): Promise<LeaseMissingRow[]> {
  const { clause, params } = ownerFilter(scope, 'u');
  const [rows] = await db.execute<LeaseMissingRow[]>(
    `SELECT u.id, u.monthlyLeasePayment, DAY(CURDATE()) AS dayOfMonth
     FROM fleet_units u
     WHERE u.status != 'Descontinuada'
       AND u.monthlyLeasePayment IS NOT NULL AND u.monthlyLeasePayment > 0
       AND ${clause}
       AND NOT EXISTS (
         SELECT 1 FROM financial_transactions ft
         WHERE ft.unit_id = u.id AND ft.category_id = ?
           AND ft.period = DATE_FORMAT(CURDATE(), '%Y-%m')
       )
     LIMIT 50`,
    [...params, leaseCategoryId]
  );
  return rows;
}

export interface FineRow extends RowDataPacket {
  id: number;
  unit_id: string;
  amount: number;
  vendor: string | null;
  created_at: unknown;
}

/** T4: `financial_transactions` has no owner column — join `fleet_units` via `unit_id`. */
export async function countFinesRegistered(
  scope: TenantScope,
  fineCategoryId: number
): Promise<number> {
  const { clause, params } = ownerFilter(scope, 'fu');
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS fineCount
     FROM financial_transactions ft
     JOIN fleet_units fu ON fu.id = ft.unit_id
     WHERE ft.category_id = ?
       AND ft.created_at >= DATE_SUB(NOW(), INTERVAL ${FINE_WINDOW_DAYS} DAY)
       AND ${clause}`,
    [fineCategoryId, ...params]
  );
  return Number(rows[0].fineCount);
}

/** Rows for fines registered within the recency window, tenant-scoped (LIMIT 50). */
export async function listFinesRegistered(
  scope: TenantScope,
  fineCategoryId: number
): Promise<FineRow[]> {
  const { clause, params } = ownerFilter(scope, 'fu');
  const [rows] = await db.execute<FineRow[]>(
    `SELECT ft.id, ft.unit_id, ft.amount, ft.vendor, ft.created_at
     FROM financial_transactions ft
     JOIN fleet_units fu ON fu.id = ft.unit_id
     WHERE ft.category_id = ?
       AND ft.created_at >= DATE_SUB(NOW(), INTERVAL ${FINE_WINDOW_DAYS} DAY)
       AND ${clause}
     ORDER BY ft.created_at DESC
     LIMIT 50`,
    [fineCategoryId, ...params]
  );
  return rows;
}

export interface AnomalyRow extends RowDataPacket {
  unit_id: string;
  currentTotal: number;
  prevTotal: number;
  prevPeriods: number;
}

/** Count of units whose current-month spend anomalously exceeds their semester average, tenant-scoped. */
export async function countExpenseAnomalies(scope: TenantScope): Promise<number> {
  const { clause, params } = ownerFilter(scope, 'fu');
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS anomalyCount FROM (
       SELECT ft.unit_id
       FROM financial_transactions ft
       JOIN fleet_units fu ON fu.id = ft.unit_id
       WHERE ft.period >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL ${ANOMALY_WINDOW_MONTHS} MONTH), '%Y-%m')
         AND ${clause}
       GROUP BY ft.unit_id
       HAVING COUNT(DISTINCT CASE WHEN ft.period <> DATE_FORMAT(CURDATE(), '%Y-%m') THEN ft.period END) >= ${ANOMALY_MIN_HISTORY_PERIODS}
          AND SUM(CASE WHEN ft.period <> DATE_FORMAT(CURDATE(), '%Y-%m') THEN ft.amount ELSE 0 END) > 0
          AND SUM(CASE WHEN ft.period = DATE_FORMAT(CURDATE(), '%Y-%m') THEN ft.amount ELSE 0 END) >=
              (SUM(CASE WHEN ft.period <> DATE_FORMAT(CURDATE(), '%Y-%m') THEN ft.amount ELSE 0 END)
               / COUNT(DISTINCT CASE WHEN ft.period <> DATE_FORMAT(CURDATE(), '%Y-%m') THEN ft.period END)) * ${ANOMALY_RATIO_MEDIUM}
     ) anomalies`,
    params
  );
  return Number(rows[0].anomalyCount);
}

/** Rows for units whose current-month spend anomalously exceeds their semester average, tenant-scoped. */
export async function listExpenseAnomalies(scope: TenantScope): Promise<AnomalyRow[]> {
  const { clause, params } = ownerFilter(scope, 'fu');
  const [rows] = await db.execute<AnomalyRow[]>(
    `SELECT ft.unit_id,
            SUM(CASE WHEN ft.period = DATE_FORMAT(CURDATE(), '%Y-%m') THEN ft.amount ELSE 0 END) AS currentTotal,
            SUM(CASE WHEN ft.period <> DATE_FORMAT(CURDATE(), '%Y-%m') THEN ft.amount ELSE 0 END) AS prevTotal,
            COUNT(DISTINCT CASE WHEN ft.period <> DATE_FORMAT(CURDATE(), '%Y-%m') THEN ft.period END) AS prevPeriods
     FROM financial_transactions ft
     JOIN fleet_units fu ON fu.id = ft.unit_id
     WHERE ft.period >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL ${ANOMALY_WINDOW_MONTHS} MONTH), '%Y-%m')
       AND ${clause}
     GROUP BY ft.unit_id
     HAVING prevPeriods >= ${ANOMALY_MIN_HISTORY_PERIODS}
        AND prevTotal > 0
        AND currentTotal >= (prevTotal / prevPeriods) * ${ANOMALY_RATIO_MEDIUM}
     LIMIT 50`,
    params
  );
  return rows;
}

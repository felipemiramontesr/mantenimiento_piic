import { RowDataPacket } from 'mysql2';
import db from './db';
import * as FleetMaintenanceRepository from './fleetMaintenance.repository';
import { resolveOwnerScope as resolveScope } from './ownerScopeResolver';
import { MAINTENANCE } from '../constants/maintenance';

/**
 * FC156 F1 — FleetMaintenanceService: orchestration only, zero SQL, zero
 * Fastify (invariants I1/I2). Resolves the caller's owner scope via the
 * shared `ownerScopeResolver.ts` SSOT (Cond.R-156-M6 — no local copy) and
 * delegates all persistence to `fleetMaintenance.repository.ts` (I3). Call
 * order per endpoint is preserved verbatim from the pre-migration
 * `routes/fleetMaintenance.ts` so the existing suites keep passing
 * unmodified. Covers the 5 read-only endpoints + the cyclic service-type
 * formulas (Libro V §17, immutable) shared with the write endpoints — those
 * 4 transactional endpoints live in `fleetMaintenanceWrites.service.ts`
 * (Gate 1 `max-lines:400` split by domain, `Cond.R-156-M1`).
 */

export interface MaintenanceUser {
  id: number;
  permissions?: string[];
  tenant_id?: number | null;
}

/** Cond.R-156-M6 — delegates exclusively to the ownerScopeResolver.ts SSOT (preserves FC144). */
export function resolveOwnerScope(user: MaintenanceUser): Promise<number[] | null> {
  return resolveScope(user);
}

// ─── Cyclic service-type engine (Libro V §17.2 — verbatim, immutable) ─────────

// Declarado solo para derivar el tipo ServiceType vía `typeof` -- nunca se lee como valor en runtime.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SERVICE_TYPE_ENUM = [
  'BASIC_10K',
  'INTERMEDIATE_20K',
  'MAJOR_30K',
  'ADVANCED_50K',
  'MINOR_MINING',
] as const;

export type ServiceType = (typeof SERVICE_TYPE_ENUM)[number];

/**
 * Cyclic service type engine — canonical rule for Archon fleet.
 * Applies mod-60,000 km residue with strict ±1,000 km tolerance windows.
 * Mine units (maintIntervalKm === 5000) fill non-agency midpoints with MINOR_MINING.
 * Agency units fall back to the nearest agency milestone.
 */
export function computeServiceType(
  odometer: number,
  maintIntervalKm: number | string
): ServiceType {
  if (!odometer || odometer <= 0) return 'BASIC_10K';
  const remainder = odometer % MAINTENANCE.CYCLE_KM;
  const isMineUnit = Number(maintIntervalKm) === MAINTENANCE.MINE_UNIT_INTERVAL_KM;

  if (
    remainder <= MAINTENANCE.TOLERANCE_KM ||
    remainder >= MAINTENANCE.CYCLE_KM - MAINTENANCE.TOLERANCE_KM
  )
    return 'ADVANCED_50K';
  if (
    remainder >= MAINTENANCE.WINDOWS.ADVANCED_50K.low &&
    remainder <= MAINTENANCE.WINDOWS.ADVANCED_50K.high
  )
    return 'ADVANCED_50K';
  if (
    remainder >= MAINTENANCE.WINDOWS.MAJOR_30K.low &&
    remainder <= MAINTENANCE.WINDOWS.MAJOR_30K.high
  )
    return 'MAJOR_30K';
  if (
    remainder >= MAINTENANCE.WINDOWS.INTERMEDIATE_20K.low &&
    remainder <= MAINTENANCE.WINDOWS.INTERMEDIATE_20K.high
  )
    return 'INTERMEDIATE_20K';
  if (
    remainder >= MAINTENANCE.WINDOWS.BASIC_10K.low &&
    remainder <= MAINTENANCE.WINDOWS.BASIC_10K.high
  )
    return 'BASIC_10K';

  if (isMineUnit) return 'MINOR_MINING';

  const milestones: { type: ServiceType; value: number }[] = [...MAINTENANCE.MILESTONES];
  let best: ServiceType = 'BASIC_10K';
  let minDist = Infinity;
  milestones.forEach((m) => {
    const dist = Math.abs(remainder - m.value);
    if (dist < minDist) {
      minDist = dist;
      best = m.type;
    }
  });
  return best;
}

/** IN_SITU for mine-cycle minor service; every other service type happens at the WORKSHOP. */
export function resolveServiceMode(serviceType: ServiceType): 'IN_SITU' | 'WORKSHOP' {
  return serviceType === 'MINOR_MINING' ? 'IN_SITU' : 'WORKSHOP';
}

// ─── Template helpers (Libro V §17.1 — verbatim, immutable) ────────────────────

export type TemplateTask = {
  code: string;
  label: string;
  isCritical: boolean;
  isDeferredCarry: boolean;
};

/** Widens a resolved service type to its full agency milestone cascade (highest → lowest). */
export function buildCascadeServiceTypes(resolvedType: ServiceType): string[] {
  if (resolvedType === 'ADVANCED_50K')
    return ['ADVANCED_50K', 'MAJOR_30K', 'INTERMEDIATE_20K', 'BASIC_10K'];
  if (resolvedType === 'MAJOR_30K') return ['MAJOR_30K', 'INTERMEDIATE_20K', 'BASIC_10K'];
  if (resolvedType === 'INTERMEDIATE_20K') return ['INTERMEDIATE_20K', 'BASIC_10K'];
  return [resolvedType];
}

/**
 * Minor task → agency task that already covers the same operation.
 * Tasks with no entry here have no agency equivalent and are always included.
 */
export const MINOR_AGENCY_EQUIV: Record<string, string> = {
  OIL_CHANGE_MINING: 'OIL_CHANGE',
  OIL_FILTER_MINING: 'OIL_FILTER',
  AIR_FILTER_MINING: 'AIR_FILTER_CHANGE',
  CABIN_FILTER_MINING: 'CABIN_FILTER_CHANGE',
};

export const MINOR_FRESHNESS_THRESHOLD = 0.2;

// ─── GET /maintenance ───────────────────────────────────────────────────────────

export interface MaintenanceHistoryParams {
  cursor?: string;
  limit?: string;
}

export interface MaintenanceHistoryResult {
  data: RowDataPacket[];
  nextCursor: string | null;
}

function buildMaintenanceHistoryQuery(
  ownerScope: number[] | null,
  cursor: string | undefined,
  parsedLimit: number
): { query: string; params: (string | number)[] } {
  let query = `
    SELECT
      fm.id, fm.uuid, fm.unit_id, fm.status AS movement_status,
      fm.upa_work_order_id,
      fme.service_date,
      fm.start_reading AS odometer_at_service,
      fm.end_reading AS odometer_at_close,
      fm.fuel_level_start, fm.fuel_level_end, fm.fuel_liters_loaded, fm.fuel_amount,
      cc_st.code AS service_type, fme.service_mode,
      cc_srt.code AS system_recommended_type,
      fme.cost, fme.technician, fm.created_at, fm.start_at, fm.end_at
    FROM fleet_movements fm
    JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
    JOIN fleet_units u ON fm.unit_id = u.id
    LEFT JOIN common_catalogs cc_st ON cc_st.id = fme.service_type_id
    LEFT JOIN common_catalogs cc_srt ON cc_srt.id = fme.system_recommended_type_id
    WHERE fm.movement_type = 'MAINTENANCE'
  `;
  const params: (string | number)[] = [];

  if (ownerScope !== null) {
    query += ` AND u.ownerId IN (${ownerScope.map(() => '?').join(',')}) `;
    params.push(...ownerScope);
  }
  if (cursor) {
    const [cursorDate, cursorId] = Buffer.from(cursor, 'base64').toString('ascii').split('|');
    query += ` AND ((fm.created_at < ?) OR (fm.created_at = ? AND fm.id < ?)) `;
    params.push(cursorDate, cursorDate, Number.parseInt(cursorId, 10));
  }
  query += ` ORDER BY fm.created_at DESC, fm.id DESC LIMIT ? `;
  params.push(parsedLimit + 1);
  return { query, params };
}

/** Orchestrates `GET /maintenance` — cursor-paginated history for the caller's owner scope. */
export async function listMaintenanceHistory(
  user: MaintenanceUser,
  params: MaintenanceHistoryParams
): Promise<MaintenanceHistoryResult> {
  const parsedLimit = Number.parseInt(params.limit ?? '50', 10);
  const ownerScope = await resolveOwnerScope(user);
  if (ownerScope !== null && ownerScope.length === 0) {
    return { data: [], nextCursor: null };
  }

  const { query, params: queryParams } = buildMaintenanceHistoryQuery(
    ownerScope,
    params.cursor,
    parsedLimit
  );
  const rows = await FleetMaintenanceRepository.findMaintenanceHistory(query, queryParams, db);

  let nextCursor: string | null = null;
  if (rows.length > parsedLimit) {
    const lastItem = rows[parsedLimit - 1];
    nextCursor = Buffer.from(
      `${(lastItem.created_at as Date).toISOString()}|${lastItem.id}`
    ).toString('base64');
    rows.pop();
  }
  return { data: rows, nextCursor };
}

// ─── GET /maintenance/template/:unitId — see fleetMaintenanceTemplate.service.ts ──

// ─── GET /maintenance/forecast ──────────────────────────────────────────────────

export interface MaintenanceForecastRow {
  unitId: string;
  marca: string;
  modelo: string;
  departamento: string;
  currentOdometer: number;
  dailyUsageAvg: number;
  nextKmReading: number;
  kmRemaining: number;
  nextServiceDate: string;
  daysUntilService: number;
  triggerType: 'KM' | 'DATE';
  projectedOdometer: number;
  projectedServiceType: ServiceType;
  urgency: 'CRITICAL' | 'WARNING' | 'OK';
}

function buildForecastRow(unit: RowDataPacket, today: Date): MaintenanceForecastRow {
  const currentOdometer = Number(unit.currentOdometer);
  const dailyUsageAvg = Number(unit.dailyUsageAvg);
  const maintIntervalKm = Number(unit.maintIntervalKm);
  const maintIntervalDays = Number(unit.maintIntervalDays);
  const lastServiceReading = Number(unit.lastServiceReading);

  const lastSvcDate = new Date(unit.lastServiceDate as string);
  lastSvcDate.setHours(0, 0, 0, 0);

  const nextKmReading = lastServiceReading + maintIntervalKm;
  const kmRemaining = Math.max(0, nextKmReading - currentOdometer);
  const daysForKm = dailyUsageAvg > 0 ? kmRemaining / dailyUsageAvg : Infinity;

  const nextSvcDate = new Date(lastSvcDate);
  nextSvcDate.setDate(nextSvcDate.getDate() + maintIntervalDays);
  const daysForDate = Math.max(0, Math.round((nextSvcDate.getTime() - today.getTime()) / 86400000));

  const kmFinite = Number.isFinite(daysForKm);
  const winnerDays = kmFinite ? Math.min(daysForKm, daysForDate) : daysForDate;
  const triggerType: 'KM' | 'DATE' = kmFinite && daysForKm <= daysForDate ? 'KM' : 'DATE';
  const projectedOdometer = Math.round(currentOdometer + winnerDays * dailyUsageAvg);
  const projectedServiceType = computeServiceType(projectedOdometer, maintIntervalKm);

  let urgency: 'CRITICAL' | 'WARNING' | 'OK';
  if (winnerDays <= 7) urgency = 'CRITICAL';
  else if (winnerDays <= 30) urgency = 'WARNING';
  else urgency = 'OK';

  return {
    unitId: unit.unitId as string,
    marca: (unit.marca as string) || '—',
    modelo: (unit.modelo as string) || '—',
    departamento: (unit.departamento as string) || '—',
    currentOdometer,
    dailyUsageAvg,
    nextKmReading,
    kmRemaining: Math.round(kmRemaining),
    nextServiceDate: nextSvcDate.toISOString().split('T')[0],
    daysUntilService: Math.round(winnerDays),
    triggerType,
    projectedOdometer,
    projectedServiceType,
    urgency,
  };
}

/** Orchestrates `GET /maintenance/forecast` — per-unit next-service projection (computed, no DB write). */
export async function getMaintenanceForecast(
  user: MaintenanceUser
): Promise<MaintenanceForecastRow[]> {
  const ownerScope = await resolveOwnerScope(user);
  if (ownerScope !== null && ownerScope.length === 0) return [];

  const ownerFilter =
    ownerScope !== null ? `AND fu.ownerId IN (${ownerScope.map(() => '?').join(',')})` : '';
  const units = await FleetMaintenanceRepository.findForecastUnits(
    ownerFilter,
    ownerScope ?? [],
    db
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows: MaintenanceForecastRow[] = units.map((unit) => buildForecastRow(unit, today));

  const urgencyOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, OK: 2 };
  rows.sort((a, b) => {
    const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    return uDiff !== 0 ? uDiff : a.daysUntilService - b.daysUntilService;
  });
  return rows;
}

// ─── GET /maintenance/:uuid ─────────────────────────────────────────────────────

export type MaintenanceOrderDetail = RowDataPacket & { details: RowDataPacket[] };

/** Orchestrates `GET /maintenance/:uuid` — full order detail with tasks; `null` if not found/owned. */
export async function getMaintenanceOrder(
  user: MaintenanceUser,
  uuid: string
): Promise<MaintenanceOrderDetail | null> {
  const movement = await FleetMaintenanceRepository.findMaintenanceOrderByUuid(uuid, db);
  if (movement === null) return null;

  const ownerScope = await resolveOwnerScope(user);
  if (ownerScope !== null) {
    if (ownerScope.length === 0) return null;
    const owned = await FleetMaintenanceRepository.isUnitOwned(
      movement.unit_id as string,
      ownerScope,
      db
    );
    if (!owned) return null;
  }

  const details = await FleetMaintenanceRepository.findMaintenanceOrderDetails(
    movement.id as number,
    db
  );
  return { ...movement, details };
}

// ─── GET /maintenance/:uuid/node ────────────────────────────────────────────────

export interface MaintenanceOrderNode {
  order: RowDataPacket & { details: RowDataPacket[] };
  unit: RowDataPacket | null;
}

/** Orchestrates `GET /maintenance/:uuid/node` — order + unit context; `null` if not found/owned. */
export async function getMaintenanceOrderNode(
  user: MaintenanceUser,
  uuid: string
): Promise<MaintenanceOrderNode | null> {
  const movement = await FleetMaintenanceRepository.findMaintenanceOrderNodeByUuid(uuid, db);
  if (movement === null) return null;

  const ownerScope = await resolveOwnerScope(user);
  if (ownerScope !== null) {
    if (ownerScope.length === 0) return null;
    const owned = await FleetMaintenanceRepository.isUnitOwned(
      movement.unit_id as string,
      ownerScope,
      db
    );
    if (!owned) return null;
  }

  const [details, unit] = await Promise.all([
    FleetMaintenanceRepository.findMaintenanceOrderDetails(movement.id as number, db),
    FleetMaintenanceRepository.findUnitNodeInfo(movement.unit_id as string, db),
  ]);

  return { order: { ...movement, details }, unit };
}

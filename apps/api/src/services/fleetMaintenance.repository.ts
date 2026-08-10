import { RowDataPacket } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';

/**
 * FC156 F1 — FleetMaintenanceRepository: SQL boundary (I3) for the 5
 * read-only endpoints of the fleet maintenance domain, migrated from
 * `routes/fleetMaintenance.ts`. Every function accepts an `executor`
 * (`Pool | PoolConnection`, same pattern as `catalogMapper.ts::
 * resolveCatalogId`/`routeMovements.repository.ts`) so
 * `fleetMaintenance.service.ts` owns the transaction boundaries
 * (`Cond.R-156-M4`) — the repository only ever owns SQL text/params,
 * byte-identical to the pre-migration queries (Inv-E). The 4 transactional
 * write endpoints' SQL lives in `fleetMaintenanceWrites.repository.ts`
 * (Gate 1 `max-lines:400` split by domain, `Cond.R-156-M1`).
 */

export type Executor = Pool | PoolConnection;

// ─── fetchDeferredTasks ─────────────────────────────────────────────────────────

/** Most recent COMPLETED maintenance movement for a unit — source of DEFERRED carry-over. */
export async function findLastCompletedMaintenanceId(
  unitId: string,
  executor: Executor
): Promise<number | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT id FROM fleet_movements
     WHERE unit_id = ? AND movement_type = 'MAINTENANCE' AND status = 'COMPLETED'
     ORDER BY end_at DESC, id DESC LIMIT 1`,
    [unitId]
  );
  return rows.length > 0 ? (rows[0].id as number) : null;
}

/** DEFERRED task details of a closed maintenance order. */
export async function findDeferredTaskDetails(
  maintenanceId: number,
  executor: Executor
): Promise<RowDataPacket[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fmd.task_code, mt.label, mt.is_critical AS isCritical
     FROM fleet_maintenance_details fmd
     JOIN maintenance_tasks mt ON fmd.task_code = mt.code
     WHERE fmd.maintenance_id = ? AND fmd.status_code = 'DEFERRED'`,
    [maintenanceId]
  );
  return rows;
}

// ─── shared ownership guard (GET /template, GET /:uuid, GET /:uuid/node, PATCH complete) ──

/** `true` if `unitId` belongs to one of the caller's owner ids. */
export async function isUnitOwned(
  unitId: string,
  ownerScope: number[],
  executor: Executor
): Promise<boolean> {
  const [owned] = await executor.execute<RowDataPacket[]>(
    `SELECT id FROM fleet_units WHERE id = ? AND ownerId IN (${ownerScope
      .map(() => '?')
      .join(',')})`,
    [unitId, ...ownerScope]
  );
  return owned.length > 0;
}

// ─── GET /maintenance ───────────────────────────────────────────────────────────

/** Cursor-paginated maintenance history (includes ACTIVE movements). */
export async function findMaintenanceHistory(
  query: string,
  params: (string | number)[],
  executor: Executor
): Promise<RowDataPacket[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(query, params);
  return rows;
}

// ─── GET /maintenance/template/:unitId ─────────────────────────────────────────

/** Unit maintenance profile — brand/fuel/interval/odometer/last-service context for the template engine. */
export async function findUnitMaintenanceProfile(
  unitId: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT brandId, fuelTypeId, maintIntervalKm, maintIntervalDays, odometer,
            lastServiceReading, last_chassis_inspection_odometer, last_distribution_change_odometer
     FROM fleet_units WHERE id = ?`,
    [unitId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Agency + brand-specific plan tasks for the cascading service types. */
export async function findMaintenancePlanTasks(
  serviceTypes: string[],
  brandId: number | null,
  fuelTypeId: number | null,
  executor: Executor
): Promise<RowDataPacket[]> {
  const placeholders = serviceTypes.map(() => '?').join(', ');
  const query = `
    SELECT DISTINCT t.code, t.label, t.is_critical AS isCritical
    FROM (
      SELECT task_code FROM maintenance_plan_tasks WHERE service_type IN (${placeholders})
      UNION
      SELECT task_code FROM maintenance_brand_rules
      WHERE service_type IN (${placeholders})
        AND (
          brand_id = ?
          OR
          (brand_id IS NULL AND fuel_type_id = ?)
        )
    ) combined
    JOIN maintenance_tasks t ON combined.task_code = t.code
  `;
  const [rows] = await executor.execute<RowDataPacket[]>(query, [
    ...serviceTypes,
    ...serviceTypes,
    brandId,
    fuelTypeId,
  ]);
  return rows;
}

/** MINOR_MINING plan tasks used to merge minor service into agency milestones for mine units. */
export async function findMinorMiningTasks(
  fuelTypeId: number | null,
  executor: Executor
): Promise<RowDataPacket[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT DISTINCT t.code, t.label, t.is_critical AS isCritical
     FROM (
       SELECT task_code FROM maintenance_plan_tasks WHERE service_type = 'MINOR_MINING'
       UNION
       SELECT task_code FROM maintenance_brand_rules
       WHERE service_type = 'MINOR_MINING' AND brand_id IS NULL AND fuel_type_id = ?
     ) combined
     JOIN maintenance_tasks t ON combined.task_code = t.code`,
    [fuelTypeId]
  );
  return rows;
}

// ─── GET /maintenance/forecast ──────────────────────────────────────────────────

/** All active units (owner-filtered) with the raw fields the forecast engine projects from. */
export async function findForecastUnits(
  ownerFilter: string,
  params: (string | number)[],
  executor: Executor
): Promise<RowDataPacket[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `
    SELECT
      fu.id                                                        AS unitId,
      c_brand.label                                                AS marca,
      c_model.label                                                AS modelo,
      c_dept.label                                                 AS departamento,
      CAST(fu.odometer AS DECIMAL(12,2))                          AS currentOdometer,
      CAST(COALESCE(fu.dailyUsageAvg, 0) AS DECIMAL(10,2))       AS dailyUsageAvg,
      CAST(fu.maintIntervalKm AS DECIMAL(12,2))                   AS maintIntervalKm,
      fu.maintIntervalDays,
      CAST(COALESCE(fu.lastServiceReading, 0) AS DECIMAL(12,2))  AS lastServiceReading,
      COALESCE(DATE(fu.lastServiceDate), DATE(fu.createdAt))      AS lastServiceDate
    FROM fleet_units fu
    LEFT JOIN common_catalogs c_brand
      ON fu.brandId = c_brand.id AND c_brand.category = 'BRAND'
    LEFT JOIN common_catalogs c_model
      ON fu.modelId = c_model.id AND c_model.category = 'MODEL'
    LEFT JOIN common_catalogs c_dept
      ON fu.departmentId = c_dept.id AND c_dept.category = 'DEPARTMENT'
    WHERE fu.is_active = 1 ${ownerFilter}
    ORDER BY fu.id`,
    params
  );
  return rows;
}

// ─── GET /maintenance/:uuid ─────────────────────────────────────────────────────

/** Full maintenance order (movement + extension) by uuid — GET /:uuid shape (no start_at/end_at). */
export async function findMaintenanceOrderByUuid(
  uuid: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.id, fm.uuid, fm.unit_id, fm.status AS movement_status,
            fme.service_date,
            fm.start_reading AS odometer_at_service,
            fm.end_reading AS odometer_at_close,
            fm.fuel_level_start, fm.fuel_level_end, fm.fuel_liters_loaded, fm.fuel_amount,
            cc_st.code AS service_type, fme.service_mode,
            cc_srt.code AS system_recommended_type,
            fme.cost, fme.technician, fm.created_at
     FROM fleet_movements fm
     JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
     LEFT JOIN common_catalogs cc_st ON cc_st.id = fme.service_type_id
     LEFT JOIN common_catalogs cc_srt ON cc_srt.id = fme.system_recommended_type_id
     WHERE fm.uuid = ? AND fm.movement_type = 'MAINTENANCE'`,
    [uuid]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Task details of a maintenance order, critical-first — shared by GET /:uuid and GET /:uuid/node. */
export async function findMaintenanceOrderDetails(
  maintenanceId: number,
  executor: Executor
): Promise<RowDataPacket[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fmd.task_code AS taskCode, fmd.status_code AS status, fmd.notes,
            mt.label, mt.is_critical AS isCritical,
            mts.label AS statusLabel
     FROM fleet_maintenance_details fmd
     JOIN maintenance_tasks mt ON fmd.task_code = mt.code
     JOIN maintenance_task_statuses mts ON fmd.status_code = mts.code
     WHERE fmd.maintenance_id = ?
     ORDER BY mt.is_critical DESC, fmd.task_code`,
    [maintenanceId]
  );
  return rows;
}

// ─── GET /maintenance/:uuid/node ────────────────────────────────────────────────

/** Full maintenance order (movement + extension) by uuid — GET /:uuid/node shape (incl. start_at/end_at). */
export async function findMaintenanceOrderNodeByUuid(
  uuid: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.id, fm.uuid, fm.unit_id, fm.status AS movement_status,
            fme.service_date, fm.start_reading AS odometer_at_service,
            fm.end_reading AS odometer_at_close,
            fm.fuel_level_start, fm.fuel_level_end,
            fm.fuel_liters_loaded, fm.fuel_amount,
            cc_st.code AS service_type, fme.service_mode,
            cc_srt.code AS system_recommended_type,
            fme.cost, fme.technician, fm.created_at, fm.start_at, fm.end_at
     FROM fleet_movements fm
     JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
     LEFT JOIN common_catalogs cc_st ON cc_st.id = fme.service_type_id
     LEFT JOIN common_catalogs cc_srt ON cc_srt.id = fme.system_recommended_type_id
     WHERE fm.uuid = ? AND fm.movement_type = 'MAINTENANCE'`,
    [uuid]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Unit context (brand/model/year/odometer/interval/fuel) for the node view. */
export async function findUnitNodeInfo(
  unitId: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fu.id, fu.status,
            c_brand.label AS marca, c_model.label AS modelo, fu.year,
            fu.odometer, fu.maintIntervalKm, fu.lastFuelLevel
     FROM fleet_units fu
     LEFT JOIN common_catalogs c_brand ON fu.brandId = c_brand.id AND c_brand.category = 'BRAND'
     LEFT JOIN common_catalogs c_model ON fu.modelId = c_model.id AND c_model.category = 'MODEL'
     WHERE fu.id = ?`,
    [unitId]
  );
  return rows.length > 0 ? rows[0] : null;
}

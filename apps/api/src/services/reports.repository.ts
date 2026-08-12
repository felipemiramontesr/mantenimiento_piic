import { RowDataPacket } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';

/**
 * FC157 F1 — ReportsRepository: SQL boundary (I3) for the single read-only
 * `GET /reports/maintenance/:uuid/pdf` endpoint. Deliberately independent
 * from `fleetMaintenance.repository.ts` (Cond.R-157-R8) — same query shapes
 * are coincidental (both read `fleet_movements`/`fleet_maintenance_details`),
 * not shared code, preserving the bounded-context split between the
 * reporting and maintenance-execution domains.
 */

export type Executor = Pool | PoolConnection;

/** Movement + extension for a maintenance order, anti-BOPLA projection (zero PII columns). */
export async function findMaintenanceOrderByUuid(
  uuid: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [movements] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.id, fm.uuid, fm.unit_id, fm.status AS movement_status,
            fme.service_date,
            fm.start_reading AS odometer_at_service,
            fm.end_reading AS odometer_at_close,
            cc_st.code AS service_type, fme.service_mode,
            fme.cost, fme.technician, fm.created_at
     FROM fleet_movements fm
     JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
     LEFT JOIN common_catalogs cc_st ON cc_st.id = fme.service_type_id
     WHERE fm.uuid = ? AND fm.movement_type = 'MAINTENANCE'`,
    [uuid]
  );
  return movements.length > 0 ? movements[0] : null;
}

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

/** Task details of a maintenance order, critical-first — same shape the PDF renders. */
export async function findMaintenanceDetails(
  maintenanceId: number,
  executor: Executor
): Promise<RowDataPacket[]> {
  const [details] = await executor.execute<RowDataPacket[]>(
    `SELECT fmd.task_code AS taskCode, fmd.status_code AS status,
            mt.label, mts.label AS statusLabel
     FROM fleet_maintenance_details fmd
     JOIN maintenance_tasks mt ON fmd.task_code = mt.code
     JOIN maintenance_task_statuses mts ON fmd.status_code = mts.code
     WHERE fmd.maintenance_id = ?
     ORDER BY mt.is_critical DESC, fmd.task_code`,
    [maintenanceId]
  );
  return details;
}

import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';

/**
 * FC156 F1 — FleetMaintenanceWritesRepository: SQL boundary (I3) for the 4
 * transactional write endpoints (POST intake, PATCH complete/accept/reject),
 * split out of `fleetMaintenance.repository.ts` by Gate 1 `max-lines:400`
 * (same domain, `Cond.R-156-M1`). Every function accepts an `executor`
 * (`Pool | PoolConnection`, same pattern as `catalogMapper.ts::
 * resolveCatalogId`/`routeMovements.repository.ts`) so
 * `fleetMaintenanceWrites.service.ts` owns the transaction boundaries
 * (`Cond.R-156-M4`) — the repository only ever owns SQL text/params,
 * byte-identical to the pre-migration queries (Inv-E).
 */

export type Executor = Pool | PoolConnection;

// ─── applyMaintenanceCompletionToUnit ──────────────────────────────────────────

/** Current odometer reading for a unit — drives the completion-forecast math. */
export async function findUnitOdometer(
  unitId: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT odometer FROM fleet_units WHERE id = ?',
    [unitId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Writes the post-completion unit snapshot (odometer/forecast/fuel/status) — dynamic column set. */
export async function updateUnitAfterMaintenanceCompletion(
  unitId: string,
  updates: [string, string | number][],
  executor: Executor
): Promise<void> {
  const setClause = `${updates
    .map(([col]) => `${col} = ?`)
    .join(', ')}, updatedAt = CURRENT_TIMESTAMP`;
  await executor.execute(`UPDATE fleet_units SET ${setClause} WHERE id = ?`, [
    ...updates.map(([, val]) => val),
    unitId,
  ]);
}

// ─── POST /maintenance ──────────────────────────────────────────────────────────

/** Locks the target unit row ahead of a new maintenance intake (`FOR UPDATE`, transactional). */
export async function lockUnitForMaintenance(
  unitId: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT id, odometer, maintIntervalKm, status, lastFuelLevel, ownerId FROM fleet_units WHERE id = ? FOR UPDATE',
    [unitId]
  );
  return rows.length > 0 ? rows[0] : null;
}

export interface OpenMaintenanceMovementInput {
  uuid: string;
  unitId: string;
  odometerAtService: number;
  serviceDate: string;
  fuelStart: number | null;
  createdByUserId: number;
}

/** Inserts an OPEN maintenance movement — awaits technician acceptance. */
export async function insertOpenMaintenanceMovement(
  input: OpenMaintenanceMovementInput,
  executor: Executor
): Promise<number> {
  const [result] = await executor.execute<ResultSetHeader>(
    `INSERT INTO fleet_movements
    (uuid, unit_id, movement_type, status, start_reading, start_at, fuel_level_start, created_by_user_id)
   VALUES (?, ?, 'MAINTENANCE', 'OPEN', ?, ?, ?, ?)`,
    [
      input.uuid,
      input.unitId,
      input.odometerAtService,
      input.serviceDate,
      input.fuelStart,
      input.createdByUserId,
    ]
  );
  return result.insertId;
}

export interface CompletedMaintenanceMovementInput {
  uuid: string;
  unitId: string;
  odometerAtService: number;
  endOdometer: number;
  serviceDate: string;
  fuelStart: number | null;
  fuelLevelEnd: number | null;
  fuelLitersLoaded: number | null;
  fuelAmount: number | null;
}

/** Inserts a COMPLETED maintenance movement — immediate in-situ/historical log. */
export async function insertCompletedMaintenanceMovement(
  input: CompletedMaintenanceMovementInput,
  executor: Executor
): Promise<number> {
  const [result] = await executor.execute<ResultSetHeader>(
    `INSERT INTO fleet_movements
    (uuid, unit_id, movement_type, status, start_reading, end_reading,
     start_at, end_at, fuel_level_start, fuel_level_end, fuel_liters_loaded, fuel_amount)
   VALUES (?, ?, 'MAINTENANCE', 'COMPLETED', ?, ?, ?, NOW(), ?, ?, ?, ?)`,
    [
      input.uuid,
      input.unitId,
      input.odometerAtService,
      input.endOdometer,
      input.serviceDate,
      input.fuelStart,
      input.fuelLevelEnd,
      input.fuelLitersLoaded,
      input.fuelAmount,
    ]
  );
  return result.insertId;
}

export interface MaintenanceExtensionInput {
  movementId: number;
  serviceDate: string;
  serviceTypeId: number;
  serviceMode: string;
  cost: number;
  technician: string;
}

/** Inserts the CTI maintenance extension row for a movement. */
export async function insertMaintenanceExtension(
  input: MaintenanceExtensionInput,
  executor: Executor
): Promise<void> {
  await executor.execute(
    `INSERT INTO fleet_maintenance_extensions
    (movement_id, service_date, service_type_id, service_mode,
     system_recommended_type_id, cost, technician)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.movementId,
      input.serviceDate,
      input.serviceTypeId,
      input.serviceMode,
      input.serviceTypeId,
      input.cost,
      input.technician,
    ]
  );
}

/** Inserts one task-detail row for a maintenance order (intake path — no upsert). */
export async function insertMaintenanceDetail(
  maintenanceId: number,
  detail: { taskCode: string; status: string; notes: string | null },
  executor: Executor
): Promise<void> {
  await executor.execute(
    `INSERT INTO fleet_maintenance_details (maintenance_id, task_code, status_code, notes) VALUES (?, ?, ?, ?)`,
    [maintenanceId, detail.taskCode, detail.status, detail.notes]
  );
}

/** Looks up a user by full name or username — used for the fire-and-forget technician-assigned notification. */
export async function findUserByNameOrUsername(
  name: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT id FROM users WHERE fullName = ? OR username = ? LIMIT 1`,
    [name, name]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ─── PATCH /maintenance/:uuid/complete ──────────────────────────────────────────

/** Locks an ACTIVE maintenance movement by uuid ahead of closing it (`FOR UPDATE`, transactional). */
export async function lockMaintenanceOrderByUuid(
  uuid: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.id, fm.unit_id, fm.status, fme.service_date,
          cc_st.code AS service_type,
          fme.service_mode, fme.technician, fme.cost
   FROM fleet_movements fm
   JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
   LEFT JOIN common_catalogs cc_st ON cc_st.id = fme.service_type_id
   WHERE fm.uuid = ? AND fm.movement_type = 'MAINTENANCE' FOR UPDATE`,
    [uuid]
  );
  return rows.length > 0 ? rows[0] : null;
}

export interface CompleteMovementInput {
  uuid: string;
  odometerAtService: number;
  endOdometer: number;
  fuelLevelEnd: number | null;
  fuelLitersLoaded: number | null;
  fuelAmount: number | null;
}

/** Closes a maintenance movement: status → COMPLETED, final telemetry recorded. */
export async function completeMaintenanceMovement(
  input: CompleteMovementInput,
  executor: Executor
): Promise<void> {
  await executor.execute(
    `UPDATE fleet_movements
   SET status = 'COMPLETED', end_at = NOW(), start_reading = ?,
       end_reading = ?, fuel_level_end = ?, fuel_liters_loaded = ?, fuel_amount = ?
   WHERE uuid = ?`,
    [
      input.odometerAtService,
      input.endOdometer,
      input.fuelLevelEnd,
      input.fuelLitersLoaded,
      input.fuelAmount,
      input.uuid,
    ]
  );
}

/** Maintenance interval (km) of a unit — drives the cyclic service type + completion forecast. */
export async function findUnitMaintInterval(
  unitId: string,
  executor: Executor
): Promise<number | string | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT maintIntervalKm FROM fleet_units WHERE id = ?',
    [unitId]
  );
  return rows.length > 0 ? (rows[0].maintIntervalKm as number | string) : null;
}

export interface UpdateMaintenanceExtensionInput {
  movementId: number;
  serviceDate: string;
  serviceTypeId: number;
  serviceMode: string;
  cost: number;
  technician: string;
}

/** Rewrites the CTI extension row at close time (recomputed service type/mode/cost/technician). */
export async function updateMaintenanceExtension(
  input: UpdateMaintenanceExtensionInput,
  executor: Executor
): Promise<void> {
  await executor.execute(
    `UPDATE fleet_maintenance_extensions
   SET service_date = ?, service_type_id = ?, service_mode = ?,
       system_recommended_type_id = ?, cost = ?, technician = ?
   WHERE movement_id = ?`,
    [
      input.serviceDate,
      input.serviceTypeId,
      input.serviceMode,
      input.serviceTypeId,
      input.cost,
      input.technician,
      input.movementId,
    ]
  );
}

/** Upserts a task-detail row at close time (`ON DUPLICATE KEY UPDATE`). */
export async function upsertMaintenanceDetail(
  maintenanceId: number,
  detail: { taskCode: string; status: string; notes: string | null },
  executor: Executor
): Promise<void> {
  await executor.execute(
    `INSERT INTO fleet_maintenance_details (maintenance_id, task_code, status_code, notes)
   VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE status_code = VALUES(status_code), notes = VALUES(notes)`,
    [maintenanceId, detail.taskCode, detail.status, detail.notes]
  );
}

// ─── PATCH /maintenance/:uuid/accept ────────────────────────────────────────────

/** Locks an OPEN maintenance movement by uuid ahead of technician acceptance (`FOR UPDATE`). */
export async function lockOpenMaintenanceOrderByUuid(
  uuid: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.id, fm.unit_id, fm.status, fm.created_by_user_id,
            cc_st.code AS service_type, fme.technician
     FROM fleet_movements fm
     JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
     LEFT JOIN common_catalogs cc_st ON cc_st.id = fme.service_type_id
     WHERE fm.uuid = ? AND fm.movement_type = 'MAINTENANCE' FOR UPDATE`,
    [uuid]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Transitions a movement OPEN → ACTIVE. */
export async function activateMaintenanceMovement(uuid: string, executor: Executor): Promise<void> {
  await executor.execute(
    `UPDATE fleet_movements
     SET status = 'ACTIVE', start_at = NOW()
     WHERE uuid = ?`,
    [uuid]
  );
}

/** Writes a unit's operational status (e.g. locks it to Mantenimiento). */
export async function updateUnitStatus(
  unitId: string,
  status: string,
  executor: Executor
): Promise<void> {
  await executor.execute(
    `UPDATE fleet_units SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, unitId]
  );
}

/** Links a UPA work order id to its originating maintenance movement. */
export async function linkWorkOrderToMovement(
  uuid: string,
  workOrderId: number,
  executor: Executor
): Promise<void> {
  await executor.execute(`UPDATE fleet_movements SET upa_work_order_id = ? WHERE uuid = ?`, [
    workOrderId,
    uuid,
  ]);
}

/** N_A/DEFERRED task-detail codes to bridge into the freshly-created UPA work order. */
export async function findBridgeTaskStatuses(
  maintenanceId: number,
  executor: Executor
): Promise<RowDataPacket[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT task_code, status_code
     FROM fleet_maintenance_details
     WHERE maintenance_id = ? AND status_code IN ('N_A', 'DEFERRED')`,
    [maintenanceId]
  );
  return rows;
}

/** Marks bridged UPA work-order tasks as structurally N/A. */
export async function markWorkOrderTasksStructuralNA(
  workOrderId: number,
  taskIds: string[],
  executor: Executor
): Promise<void> {
  if (taskIds.length === 0) return;
  const placeholders = taskIds.map(() => '?').join(',');
  await executor.execute(
    `UPDATE upa_work_order_tasks SET status = 'N_A_STRUCTURAL'
     WHERE work_order_id = ? AND task_id IN (${placeholders})`,
    [workOrderId, ...taskIds]
  );
}

/** Marks bridged UPA work-order tasks as financially deferred. */
export async function markWorkOrderTasksDeferredFinancial(
  workOrderId: number,
  taskIds: string[],
  executor: Executor
): Promise<void> {
  if (taskIds.length === 0) return;
  const placeholders = taskIds.map(() => '?').join(',');
  await executor.execute(
    `UPDATE upa_work_order_tasks SET status = 'DEFERRED_FINANCIAL'
     WHERE work_order_id = ? AND task_id IN (${placeholders})`,
    [workOrderId, ...taskIds]
  );
}

// ─── PATCH /maintenance/:uuid/reject ─────────────────────────────────────────────

/** Locks an OPEN maintenance movement by uuid ahead of technician rejection (`FOR UPDATE`). */
export async function lockOpenMaintenanceOrderForReject(
  uuid: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.id, fm.unit_id, fm.status, fm.created_by_user_id,
            fme.technician
     FROM fleet_movements fm
     JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
     WHERE fm.uuid = ? AND fm.movement_type = 'MAINTENANCE' FOR UPDATE`,
    [uuid]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Clears the assigned technician so the responsable can reassign. */
export async function clearMaintenanceTechnician(
  maintenanceId: number,
  executor: Executor
): Promise<void> {
  await executor.execute(
    `UPDATE fleet_maintenance_extensions SET technician = NULL WHERE movement_id = ?`,
    [maintenanceId]
  );
}

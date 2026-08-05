import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';

/**
 * FC126 F1 — RouteMovementsRepository: SQL boundary (I3) for the fleet
 * movement lifecycle (start/finish/update/delete a route + odometer sync),
 * migrated from `services/routeService.ts`. Split out of the original
 * monolithic `routeRoutes.repository.ts` (Gate 1 max-lines:400) — this file
 * groups the mutation lifecycle; read-heavy incident/checkpoint queries live
 * in `routeIncidents.repository.ts`, `routes/fleetRoutes.ts`-origin queries
 * in `routeRoutes.repository.ts`. Every function accepts an `executor`
 * (`Pool | PoolConnection`, same pattern as `catalogMapper.ts::
 * resolveCatalogId`) so `RouteService` keeps its existing transaction
 * boundaries — the repository only ever owns SQL text/params.
 */

type Executor = Pool | PoolConnection;

// ─── routeService.ts — syncUnitState ────────────────────────────────────────

/** Most recent COMPLETED route for a unit, source of truth for odometer/fuel sync. */
export async function findLastCompletedRoute(
  unitId: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT end_reading, fuel_level_end
     FROM fleet_movements
     WHERE unit_id = ? AND movement_type = 'ROUTE' AND status = 'COMPLETED'
     ORDER BY end_at DESC, id DESC LIMIT 1`,
    [unitId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Writes the unit odometer/fuel level snapshot after a completed route. */
export async function updateUnitOdometerAndFuel(
  unitId: string,
  odometer: number,
  fuelLevel: number,
  executor: Executor
): Promise<void> {
  await executor.execute('UPDATE fleet_units SET odometer = ?, lastFuelLevel = ? WHERE id = ?', [
    odometer,
    fuelLevel,
    unitId,
  ]);
}

// ─── routeService.ts — startRoute ───────────────────────────────────────────

/** Locks and reads a unit row (status, odometer) ahead of starting a route. */
export async function findUnitStatusForUpdate(
  unitId: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT status, odometer FROM fleet_units WHERE id = ? FOR UPDATE',
    [unitId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Resolves a neighborhood/municipality/state label from its catalog id. */
export async function findNeighborhoodLabel(
  neighborhoodId: number,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT c.name AS neighborhood, m.name AS municipality, e.name AS state
     FROM neighborhoods c
     JOIN municipalities m ON c.municipality_id = m.id
     JOIN states e ON m.state_id = e.id
     WHERE c.id = ?`,
    [neighborhoodId]
  );
  return rows.length > 0 ? rows[0] : null;
}

export interface InsertRouteMovementParams {
  uuid: string;
  unitId: string;
  startReading: number;
  fuelLevelStart: number;
  description?: string | null;
}

/** Creates the CTI base fleet_movements row for a new ROUTE. */
export async function insertRouteMovement(
  params: InsertRouteMovementParams,
  executor: Executor
): Promise<number> {
  const [result] = await executor.execute<ResultSetHeader>(
    `INSERT INTO fleet_movements
    (uuid, unit_id, movement_type, status, start_reading, fuel_level_start, description, start_at)
    VALUES (?, ?, 'ROUTE', 'ACTIVE', ?, ?, ?, NOW())`,
    [
      params.uuid,
      params.unitId,
      params.startReading,
      params.fuelLevelStart,
      params.description || null,
    ]
  );
  return result.insertId;
}

export interface InsertRouteExtensionParams {
  movementId: number;
  driverId: number;
  originId?: number | null;
  destinationNeighborhoodId?: number | null;
  destination: string;
}

/** Creates the CTI fleet_route_extensions row paired with a route movement. */
export async function insertRouteExtension(
  params: InsertRouteExtensionParams,
  executor: Executor
): Promise<void> {
  await executor.execute(
    `INSERT INTO fleet_route_extensions
    (movement_id, driver_id, origin_id, destination_neighborhood_id, destination)
    VALUES (?, ?, ?, ?, ?)`,
    [
      params.movementId,
      params.driverId,
      params.originId || null,
      params.destinationNeighborhoodId || null,
      params.destination,
    ]
  );
}

/** Marks a unit as "En Ruta" when a route starts. */
export async function updateUnitStatusToEnRuta(unitId: string, executor: Executor): Promise<void> {
  await executor.execute('UPDATE fleet_units SET status = "En Ruta" WHERE id = ?', [unitId]);
}

export interface InsertRouteStartLogParams {
  logUuid: string;
  unitId: string;
  routeUuid: string;
  readingBefore: number;
  statusBefore: string;
  createdBy: number;
}

/** Writes the ROUTE_START forensic entry to unit_activity_logs. */
export async function insertRouteStartActivityLog(
  params: InsertRouteStartLogParams,
  executor: Executor
): Promise<void> {
  await executor.execute(
    `INSERT INTO unit_activity_logs
    (uuid, unit_id, event_type, reference_id, reading_before, status_before, status_after, created_by)
    VALUES (?, ?, 'ROUTE_START', ?, ?, ?, 'En Ruta', ?)`,
    [
      params.logUuid,
      params.unitId,
      params.routeUuid,
      params.readingBefore,
      params.statusBefore,
      params.createdBy,
    ]
  );
}

// ─── routeService.ts — finishRoute ──────────────────────────────────────────

/** Locks and reads a route movement + its extension by uuid. */
export async function findRouteForUpdateByUuid(
  routeUuid: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.*, fre.driver_id
     FROM fleet_movements fm
     JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
     WHERE fm.uuid = ? FOR UPDATE`,
    [routeUuid]
  );
  return rows.length > 0 ? rows[0] : null;
}

export interface UpdateRouteMovementCompletionParams {
  endReading: number;
  fuelLevelEnd: number;
  fuelLiters: number;
  fuelAmount: number;
  fuelImage?: string | null;
  description?: string | null;
}

/** Marks a route movement COMPLETED with its closing telemetry. */
export async function updateRouteMovementCompletion(
  routeUuid: string,
  params: UpdateRouteMovementCompletionParams,
  executor: Executor
): Promise<void> {
  await executor.execute(
    `UPDATE fleet_movements
    SET status = 'COMPLETED', end_reading = ?, end_at = NOW(),
        fuel_level_end = ?, fuel_liters_loaded = ?, fuel_amount = ?, fuel_ticket_image = ?,
        description = COALESCE(?, description)
    WHERE uuid = ?`,
    [
      params.endReading,
      params.fuelLevelEnd,
      params.fuelLiters,
      params.fuelAmount,
      params.fuelImage || null,
      params.description || null,
      routeUuid,
    ]
  );
}

export interface UpdateRouteExtensionLogisticsParams {
  additivesCheck: boolean;
  tirePressureJson?: string | null;
  checklistJson?: string | null;
}

/** Writes post-trip logistics fields (additives/tire pressure/checklist). */
export async function updateRouteExtensionLogistics(
  movementId: number,
  params: UpdateRouteExtensionLogisticsParams,
  executor: Executor
): Promise<void> {
  await executor.execute(
    `UPDATE fleet_route_extensions
    SET additives_check = ?, tire_pressure_json = ?, checklist_json = ?
    WHERE movement_id = ?`,
    [
      params.additivesCheck,
      params.tirePressureJson || null,
      params.checklistJson || null,
      movementId,
    ]
  );
}

/** Writes final odometer/fuel and releases the unit to "Disponible". */
export async function updateUnitTelemetryOnFinish(
  unitId: string,
  endReading: number,
  fuelLevelEnd: number,
  executor: Executor
): Promise<void> {
  await executor.execute(
    'UPDATE fleet_units SET odometer = ?, lastFuelLevel = ?, status = "Disponible" WHERE id = ?',
    [endReading, fuelLevelEnd, unitId]
  );
}

export interface InsertRouteFinishLogParams {
  logUuid: string;
  unitId: string;
  routeUuid: string;
  readingBefore: number;
  readingAfter: number;
  createdBy: number;
}

/** Writes the ROUTE_FINISH forensic entry to unit_activity_logs. */
export async function insertRouteFinishActivityLog(
  params: InsertRouteFinishLogParams,
  executor: Executor
): Promise<void> {
  await executor.execute(
    `INSERT INTO unit_activity_logs
    (uuid, unit_id, event_type, reference_id, reading_before, reading_after, status_before, status_after, created_by)
    VALUES (?, ?, 'ROUTE_FINISH', ?, ?, ?, 'En Ruta', 'Disponible', ?)`,
    [
      params.logUuid,
      params.unitId,
      params.routeUuid,
      params.readingBefore,
      params.readingAfter,
      params.createdBy,
    ]
  );
}

export interface InsertFuelTransactionParams {
  unitId: string;
  categoryId: number;
  amount: number;
  period: string;
  sourceId: number;
  sourceUuid: string;
  notes: string;
  createdBy: number;
}

/** Idempotent fuel-cost ledger entry, guarded by source_id+source_uuid. */
export async function insertFuelTransactionIfAbsent(
  params: InsertFuelTransactionParams,
  executor: Executor
): Promise<void> {
  await executor.execute(
    `INSERT INTO financial_transactions
       (uuid, unit_id, category_id, amount, period, source_id, source_uuid, notes, created_by, created_at)
     SELECT UUID(), ?, ?, ?, ?, ?, ?, ?, ?, NOW()
     WHERE NOT EXISTS (
       SELECT 1 FROM financial_transactions
       WHERE source_id = ? AND source_uuid = ?
     )`,
    [
      params.unitId,
      params.categoryId,
      params.amount,
      params.period,
      params.sourceId,
      params.sourceUuid,
      params.notes,
      params.createdBy,
      params.sourceId,
      params.sourceUuid,
    ]
  );
}

// ─── routeService.ts — updateRoute ───────────────────────────────────────────

/** Locks and reads the full joined route snapshot ahead of a forensic update. */
export async function findRouteSnapshotForUpdate(
  uuid: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.*, fre.driver_id, fre.origin_id, fre.destination_neighborhood_id,
            fre.destination, fre.additives_check, fre.tire_pressure_json, fre.checklist_json
     FROM fleet_movements fm
     JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
     WHERE fm.uuid = ? FOR UPDATE`,
    [uuid]
  );
  return rows.length > 0 ? rows[0] : null;
}

type DynamicFieldValue = string | number | boolean | null;

/** Applies a dynamic SET clause (fixed col=? fragments) to fleet_movements. */
export async function updateRouteMovementFields(
  uuid: string,
  setClause: string,
  values: DynamicFieldValue[],
  executor: Executor
): Promise<void> {
  await executor.execute(`UPDATE fleet_movements SET ${setClause} WHERE uuid = ?`, [
    ...values,
    uuid,
  ]);
}

/** Applies a dynamic SET clause (fixed col=? fragments) to fleet_route_extensions. */
export async function updateRouteExtensionFields(
  movementId: number,
  setClause: string,
  values: DynamicFieldValue[],
  executor: Executor
): Promise<void> {
  await executor.execute(`UPDATE fleet_route_extensions SET ${setClause} WHERE movement_id = ?`, [
    ...values,
    movementId,
  ]);
}

/** Reads the joined route snapshot, no row lock — used for the post-update audit diff. */
export async function findRouteSnapshotByUuid(
  uuid: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.*, fre.driver_id, fre.origin_id, fre.destination_neighborhood_id,
            fre.destination, fre.additives_check, fre.tire_pressure_json, fre.checklist_json
     FROM fleet_movements fm
     JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
     WHERE fm.uuid = ?`,
    [uuid]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ─── routeService.ts — deleteRoute ───────────────────────────────────────────

/** Locks and reads a route + its driver ahead of a forensic delete. */
export async function findRouteWithDriverForUpdateByUuid(
  uuid: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.*, fre.driver_id FROM fleet_movements fm
     JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
     WHERE fm.uuid = ? FOR UPDATE`,
    [uuid]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Deletes a route movement (cascades to fleet_route_extensions). */
export async function deleteRouteByUuid(uuid: string, executor: Executor): Promise<void> {
  await executor.execute('DELETE FROM fleet_movements WHERE uuid = ?', [uuid]);
}

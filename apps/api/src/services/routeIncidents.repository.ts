import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';
import db from './db';

/**
 * FC126 F1 — RouteIncidentsRepository: SQL boundary (I3) for active-route
 * lookup, incident reporting, checkpoints, and incident listing, migrated
 * from `services/routeService.ts`. See `routeMovements.repository.ts` for
 * why this was split out of the original monolithic file (Gate 1
 * max-lines:400). Same `executor: Pool | PoolConnection` pattern throughout.
 */

type Executor = Pool | PoolConnection;

// ─── routeService.ts — getActiveRoute ───────────────────────────────────────

/** Currently ACTIVE route for a unit, with its extension fields merged. */
export async function findActiveRouteByUnit(
  unitId: string,
  executor: Executor = db
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.*, fre.driver_id, fre.origin_id, fre.destination_neighborhood_id,
            fre.destination, fre.additives_check, fre.tire_pressure_json, fre.checklist_json
     FROM fleet_movements fm
     JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
     WHERE fm.unit_id = ? AND fm.movement_type = 'ROUTE' AND fm.status = 'ACTIVE' LIMIT 1`,
    [unitId]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ─── routeService.ts — reportIncident ───────────────────────────────────────

/** Reads a route movement + its driver by uuid, no row lock. */
export async function findRouteWithDriverByUuid(
  routeUuid: string,
  executor: Executor
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.*, fre.driver_id
     FROM fleet_movements fm
     JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
     WHERE fm.uuid = ?`,
    [routeUuid]
  );
  return rows.length > 0 ? rows[0] : null;
}

export interface InsertIncidentParams {
  routeUuid: string;
  categoryId: number;
  description: string;
  severity: string;
  evidenceImage?: string | null;
}

/** Creates a route_incidents row in OPEN status. */
export async function insertIncident(
  params: InsertIncidentParams,
  executor: Executor
): Promise<void> {
  await executor.execute(
    `INSERT INTO route_incidents
    (route_uuid, category_id, description, severity, evidence_image, status)
    VALUES (?, ?, ?, ?, ?, 'OPEN')`,
    [
      params.routeUuid,
      params.categoryId,
      params.description,
      params.severity,
      params.evidenceImage || null,
    ]
  );
}

export interface InsertIncidentLogParams {
  logUuid: string;
  unitId: string;
  routeUuid: string;
  readingBefore: number;
  statusBefore: string;
  statusAfter: string;
  description: string;
  createdBy: number;
}

/** Writes the ROUTE_INCIDENT forensic entry to unit_activity_logs. */
export async function insertIncidentActivityLog(
  params: InsertIncidentLogParams,
  executor: Executor
): Promise<void> {
  await executor.execute(
    `INSERT INTO unit_activity_logs
    (uuid, unit_id, event_type, reference_id, reading_before, status_before, status_after, description, created_by)
    VALUES (?, ?, 'ROUTE_INCIDENT', ?, ?, ?, ?, ?, ?)`,
    [
      params.logUuid,
      params.unitId,
      params.routeUuid,
      params.readingBefore,
      params.statusBefore,
      params.statusAfter,
      params.description,
      params.createdBy,
    ]
  );
}

/** Applies the unit status impact of a newly reported incident. */
export async function updateUnitStatusForIncident(
  unitId: string,
  status: string,
  executor: Executor
): Promise<void> {
  await executor.execute('UPDATE fleet_units SET status = ? WHERE id = ?', [status, unitId]);
}

// ─── routeService.ts — addCheckpoint / getCheckpoints / arriveAtCheckpoint ──

/** Resolves a ROUTE movement id + status from its uuid. */
export async function findRouteIdByUuid(
  routeUuid: string,
  executor: Executor = db
): Promise<{ id: number; status: string } | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.id, fm.status FROM fleet_movements fm
     WHERE fm.uuid = ? AND fm.movement_type = 'ROUTE'`,
    [routeUuid]
  );
  return rows.length > 0 ? (rows[0] as { id: number; status: string }) : null;
}

export interface InsertCheckpointParams {
  movementId: number;
  sequence: number;
  name: string;
  neighborhoodId?: number | null;
  eta?: string | null;
}

/** Creates a fleet_route_checkpoints row for a route. */
export async function insertCheckpoint(
  params: InsertCheckpointParams,
  executor: Executor = db
): Promise<number> {
  const [result] = await executor.execute<ResultSetHeader>(
    `INSERT INTO fleet_route_checkpoints (movement_id, sequence, name, neighborhood_id, eta)
     VALUES (?, ?, ?, ?, ?)`,
    [
      params.movementId,
      params.sequence,
      params.name,
      params.neighborhoodId ?? null,
      params.eta ?? null,
    ]
  );
  return result.insertId;
}

/** Lists a route's checkpoints ordered by sequence. */
export async function listCheckpointsByMovementId(
  movementId: number,
  executor: Executor = db
): Promise<RowDataPacket[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT id, movement_id, sequence, name, neighborhood_id, eta, arrived_at, status, created_at
     FROM fleet_route_checkpoints
     WHERE movement_id = ?
     ORDER BY sequence ASC`,
    [movementId]
  );
  return rows;
}

/** Marks a PENDING checkpoint as VISITED with arrived_at=NOW(). */
export async function markCheckpointVisited(
  checkpointId: number,
  movementId: number,
  executor: Executor = db
): Promise<number> {
  const [result] = await executor.execute<ResultSetHeader>(
    `UPDATE fleet_route_checkpoints
     SET status = 'VISITED', arrived_at = NOW()
     WHERE id = ? AND movement_id = ? AND status = 'PENDING'`,
    [checkpointId, movementId]
  );
  return result.affectedRows;
}

// ─── routeService.ts — getIncidents / getAllIncidents ───────────────────────

/** Lists incidents reported for a single route. */
export async function listIncidentsByRouteUuid(
  routeUuid: string,
  executor: Executor = db
): Promise<RowDataPacket[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT ri.id, ri.uuid, ri.route_uuid,
            cc.code AS category, ri.category_id,
            ri.description, ri.severity, ri.evidence_image, ri.status,
            ri.reported_at, ri.resolved_at, ri.resolved_by, ri.resolution_notes
     FROM route_incidents ri
     LEFT JOIN common_catalogs cc ON cc.id = ri.category_id
     WHERE ri.route_uuid = ?
     ORDER BY ri.reported_at DESC`,
    [routeUuid]
  );
  return rows;
}

/** Lists incidents across the fleet, optionally scoped to a set of owner ids. */
export async function listAllIncidents(
  ownerIds: number[] | undefined,
  executor: Executor = db
): Promise<RowDataPacket[]> {
  const scopeFilter =
    ownerIds && ownerIds.length > 0
      ? `AND fu.ownerId IN (${ownerIds.map(() => '?').join(', ')})`
      : '';
  const query = `SELECT
      i.id, i.uuid, i.route_uuid,
      cc.code AS category, i.category_id,
      i.description, i.severity, i.evidence_image, i.status,
      i.reported_at, i.resolved_at, i.resolved_by, i.resolution_notes,
      fm.unit_id,
      u.full_name as driver_name
    FROM route_incidents i
    JOIN fleet_movements fm ON i.route_uuid = fm.uuid COLLATE utf8mb4_unicode_ci
    JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
    JOIN users u ON fre.driver_id = u.id
    JOIN fleet_units fu ON fm.unit_id = fu.id
    LEFT JOIN common_catalogs cc ON cc.id = i.category_id
    WHERE 1=1 ${scopeFilter}
    ORDER BY i.reported_at DESC`;
  const [rows] = await executor.execute<RowDataPacket[]>(
    query,
    ownerIds && ownerIds.length > 0 ? ownerIds : undefined
  );
  return rows;
}

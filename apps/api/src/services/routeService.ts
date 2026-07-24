/* eslint-disable */
// @ts-nocheck
import { RowDataPacket, PoolConnection, ResultSetHeader } from 'mysql2';
import { randomUUID } from 'node:crypto';
import db from './db';
import { recordAuditLog } from './auditService';
import { UNIT_STATUS, MOVEMENT_STATUS } from '../constants/statuses';
import { resolveCatalogId } from './catalogMapper';

/**
 * 🔱 Archon RouteService — CTI Architecture (V2)
 * All journey data lives in fleet_movements (base) + fleet_route_extensions (child).
 */
export type RouteStatus = 'OPEN' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface RouteEntry {
  id?: number;
  uuid: string;
  unit_id: string;
  driver_id: number;
  origin_id?: number;
  destination_neighborhood_id?: number;
  destination: string;
  status: RouteStatus;
  start_reading: number;
  end_reading?: number;
  start_at?: Date;
  end_at?: Date;
  fuel_level_start: number;
  fuel_level_end?: number;
  fuel_liters_loaded?: number;
  fuel_amount?: number;
  fuel_ticket_image?: string;
  additives_check?: boolean;
  tire_pressure_json?: string;
  checklist_json?: string;
  description?: string;
}

export default class RouteService {
  /**
   * Syncs unit odometer/fuel from the most recent completed ROUTE movement.
   */
  private static async syncUnitState(connection: PoolConnection, unitId: string): Promise<void> {
    if (!unitId) return;

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT end_reading, fuel_level_end
       FROM fleet_movements
       WHERE unit_id = ? AND movement_type = 'ROUTE' AND status = 'COMPLETED'
       ORDER BY end_at DESC, id DESC LIMIT 1`,
      [unitId]
    );

    if (rows.length > 0) {
      await connection.execute(
        'UPDATE fleet_units SET odometer = ?, lastFuelLevel = ? WHERE id = ?',
        [rows[0].end_reading, rows[0].fuel_level_end, unitId]
      );
    }
  }

  /**
   * Starts a journey: creates fleet_movements + fleet_route_extensions atomically.
   */
  static async startRoute(
    unitId: string,
    driverId: number,
    startReading: number,
    fuelLevelStart: number,
    destination: string,
    originId?: number,
    description?: string,
    destinationNeighborhoodId?: number
  ): Promise<string> {
    const connection = await db.getConnection();
    const routeUuid = randomUUID();

    try {
      await connection.beginTransaction();

      // 1. Validate unit availability
      const [units] = await connection.execute<RowDataPacket[]>(
        'SELECT status, odometer FROM fleet_units WHERE id = ? FOR UPDATE',
        [unitId]
      );

      if (units.length === 0) throw new Error(`Unit ${unitId} not found`);
      if (units[0].status === UNIT_STATUS.IN_ROUTE)
        throw new Error(`Unit ${unitId} is already in transit`);
      if (units[0].status === 'Downtime') throw new Error(`Unit ${unitId} is under maintenance`);
      if (startReading < units[0].odometer) {
        throw new Error(
          `Start reading (${startReading} KM) cannot be lower than the unit's current odometer (${units[0].odometer} KM)`
        );
      }

      // 1.1 Resolve destination via neighborhood catalog if ID provided
      let finalDestination = destination;
      if (destinationNeighborhoodId) {
        const [coloniaRows] = await connection.execute<RowDataPacket[]>(
          `SELECT c.name AS neighborhood, m.name AS municipality, e.name AS state
           FROM neighborhoods c
           JOIN municipalities m ON c.municipality_id = m.id
           JOIN states e ON m.state_id = e.id
           WHERE c.id = ?`,
          [destinationNeighborhoodId]
        );
        if (coloniaRows.length > 0) {
          const row = coloniaRows[0];
          const suffix = `${row.neighborhood}, ${row.municipality}, ${row.state}`;
          if (destination && destination !== suffix) {
            const parts = destination.split(row.neighborhood);
            const prefix = parts[0].trim().replace(/,\s*$/, '');
            finalDestination = prefix ? `${prefix}, ${suffix}` : suffix;
          } else {
            finalDestination = suffix;
          }
        }
      }

      // 2. Insert CTI base record
      const [movementResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO fleet_movements
        (uuid, unit_id, movement_type, status, start_reading, fuel_level_start, description, start_at)
        VALUES (?, ?, 'ROUTE', 'ACTIVE', ?, ?, ?, NOW())`,
        [routeUuid, unitId, startReading, fuelLevelStart, description || null]
      );
      const movementId = movementResult.insertId;

      // 3. Insert CTI route extension
      await connection.execute(
        `INSERT INTO fleet_route_extensions
        (movement_id, driver_id, origin_id, destination_neighborhood_id, destination)
        VALUES (?, ?, ?, ?, ?)`,
        [
          movementId,
          driverId,
          originId || null,
          destinationNeighborhoodId || null,
          finalDestination,
        ]
      );

      // 4. Update unit status
      await connection.execute('UPDATE fleet_units SET status = "En Ruta" WHERE id = ?', [unitId]);

      // 5. Forensic log
      await connection.execute(
        `INSERT INTO unit_activity_logs
        (uuid, unit_id, event_type, reference_id, reading_before, status_before, status_after, created_by)
        VALUES (?, ?, 'ROUTE_START', ?, ?, ?, 'En Ruta', ?)`,
        [randomUUID(), unitId, routeUuid, units[0].odometer, units[0].status, driverId]
      );

      await connection.commit();
      connection.release();
      return routeUuid;
    } catch (e) {
      await connection.rollback();
      connection.release();
      throw e;
    }
  }

  /**
   * Completes a journey: updates fleet_movements + fleet_route_extensions + fleet_units.
   */
  static async finishRoute(
    routeUuid: string,
    params: {
      endReading: number;
      fuelLevelEnd: number;
      fuelImage?: string;
      tirePressureJson?: string;
      checklistJson?: string;
      fuelLiters?: number;
      fuelAmount?: number;
      additivesCheck?: boolean;
      description?: string;
    }
  ): Promise<void> {
    const {
      endReading,
      fuelLevelEnd,
      fuelImage,
      tirePressureJson,
      checklistJson,
      fuelLiters = 0,
      fuelAmount = 0,
      additivesCheck = false,
      description,
    } = params;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Get movement + extension context
      const [routes] = await connection.execute<RowDataPacket[]>(
        `SELECT fm.*, fre.driver_id
         FROM fleet_movements fm
         JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
         WHERE fm.uuid = ? FOR UPDATE`,
        [routeUuid]
      );

      if (routes.length === 0) throw new Error('Route not found');
      const route = routes[0];
      if (route.status !== 'ACTIVE') throw new Error('Route is not active');
      if (endReading < route.start_reading) {
        throw new Error('End reading cannot be lower than start reading');
      }

      // 2. Update movement (telemetry fields)
      await connection.execute(
        `UPDATE fleet_movements
        SET status = 'COMPLETED', end_reading = ?, end_at = NOW(),
            fuel_level_end = ?, fuel_liters_loaded = ?, fuel_amount = ?, fuel_ticket_image = ?,
            description = COALESCE(?, description)
        WHERE uuid = ?`,
        [
          endReading,
          fuelLevelEnd,
          fuelLiters,
          fuelAmount,
          fuelImage || null,
          description || null,
          routeUuid,
        ]
      );

      // 3. Update route extension (logistics fields)
      await connection.execute(
        `UPDATE fleet_route_extensions
        SET additives_check = ?, tire_pressure_json = ?, checklist_json = ?
        WHERE movement_id = ?`,
        [additivesCheck, tirePressureJson || null, checklistJson || null, route.id]
      );

      // 4. Update unit
      await connection.execute(
        'UPDATE fleet_units SET odometer = ?, lastFuelLevel = ?, status = "Disponible" WHERE id = ?',
        [endReading, fuelLevelEnd, route.unit_id]
      );

      // 5. Forensic log
      await connection.execute(
        `INSERT INTO unit_activity_logs
        (uuid, unit_id, event_type, reference_id, reading_before, reading_after, status_before, status_after, created_by)
        VALUES (?, ?, 'ROUTE_FINISH', ?, ?, ?, 'En Ruta', 'Disponible', ?)`,
        [randomUUID(), route.unit_id, routeUuid, route.start_reading, endReading, route.driver_id]
      );

      // 6. Register fuel cost in financial ledger (AUTO — idempotent via source_uuid)
      // FC 082 F2b3a residual (Cond.1 Bravo, 2026-07-23) — cutover de escritura:
      // category_id/source_id son la única fuente de verdad (ENUM ya nullable
      // desde F2b3a-pre, mig.168). La idempotencia migra de source='AUTO' a
      // source_id, que identifica el mismo origen sin depender del ENUM.
      if (fuelAmount > 0) {
        const period = new Date().toISOString().slice(0, 7);
        const fuelCategoryId = await resolveCatalogId('FINANCE_CATEGORY', 'FUEL', connection);
        const autoSourceId = await resolveCatalogId('FINANCE_SOURCE', 'AUTO', connection);
        await connection.execute(
          `INSERT INTO financial_transactions
             (uuid, unit_id, category_id, amount, period, source_id, source_uuid, notes, created_by, created_at)
           SELECT UUID(), ?, ?, ?, ?, ?, ?, ?, ?, NOW()
           WHERE NOT EXISTS (
             SELECT 1 FROM financial_transactions
             WHERE source_id = ? AND source_uuid = ?
           )`,
          [
            route.unit_id,
            fuelCategoryId,
            fuelAmount,
            period,
            autoSourceId,
            routeUuid,
            `Combustible + insumos ruta — ${routeUuid}`,
            route.driver_id,
            autoSourceId,
            routeUuid,
          ]
        );
      }

      await connection.commit();
      connection.release();
    } catch (e) {
      await connection.rollback();
      connection.release();
      throw e;
    }
  }

  /**
   * Returns the active ROUTE movement for a unit, with extension fields merged.
   */
  static async getActiveRoute(unitId: string): Promise<RouteEntry | null> {
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT fm.*, fre.driver_id, fre.origin_id, fre.destination_neighborhood_id,
              fre.destination, fre.additives_check, fre.tire_pressure_json, fre.checklist_json
       FROM fleet_movements fm
       JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
       WHERE fm.unit_id = ? AND fm.movement_type = 'ROUTE' AND fm.status = 'ACTIVE' LIMIT 1`,
      [unitId]
    );
    return rows.length > 0 ? (rows[0] as RouteEntry) : null;
  }

  /**
   * Records an incident during a journey.
   */
  static async reportIncident(
    routeUuid: string,
    category: string,
    description: string,
    severity: string,
    evidenceImage?: string
  ): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Get movement + driver context
      const [routes] = await connection.execute<RowDataPacket[]>(
        `SELECT fm.*, fre.driver_id
         FROM fleet_movements fm
         JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
         WHERE fm.uuid = ?`,
        [routeUuid]
      );
      if (routes.length === 0) throw new Error('Route not found');
      const route = routes[0];

      // 2. Insert incident
      // FC 082 F2b3a — cutover de escritura: category_id es la única fuente
      // de verdad (ENUM ya nullable desde F2b3a-pre, mig.168). `category`
      // (el parámetro) sigue usándose para el branch de negocio de abajo y
      // la notificación — solo la columna DB deja de escribirse.
      const categoryId = await resolveCatalogId('INCIDENT_CATEGORY', category, connection);
      await connection.execute(
        `INSERT INTO route_incidents
        (route_uuid, category_id, description, severity, evidence_image, status)
        VALUES (?, ?, ?, ?, ?, 'OPEN')`,
        [routeUuid, categoryId, description, severity, evidenceImage || null]
      );

      // 3. Determine unit status impact (Industrial Safety Protocol)
      let nextStatus =
        route.status === MOVEMENT_STATUS.ACTIVE ? UNIT_STATUS.IN_ROUTE : UNIT_STATUS.AVAILABLE;
      if (severity === 'CRITICAL') {
        nextStatus = UNIT_STATUS.MAINTENANCE;
      } else if (category === 'SINIESTRO') {
        nextStatus = UNIT_STATUS.DISCONTINUED;
      }

      // 4. Forensic journal entry
      await connection.execute(
        `INSERT INTO unit_activity_logs
        (uuid, unit_id, event_type, reference_id, reading_before, status_before, status_after, description, created_by)
        VALUES (?, ?, 'ROUTE_INCIDENT', ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          route.unit_id,
          routeUuid,
          route.start_reading,
          route.status === MOVEMENT_STATUS.ACTIVE ? UNIT_STATUS.IN_ROUTE : UNIT_STATUS.AVAILABLE,
          nextStatus,
          `${category}: ${description.substring(0, 100)}`,
          route.driver_id,
        ]
      );

      // 5. Apply unit status impact if it changed
      if (
        nextStatus !==
        (route.status === MOVEMENT_STATUS.ACTIVE ? UNIT_STATUS.IN_ROUTE : UNIT_STATUS.AVAILABLE)
      ) {
        await connection.execute('UPDATE fleet_units SET status = ? WHERE id = ?', [
          nextStatus,
          route.unit_id,
        ]);
      }

      await connection.commit();
      connection.release();
    } catch (e) {
      await connection.rollback();
      connection.release();
      throw e;
    }
  }

  /**
   * Adds a checkpoint to an existing route (ACTIVE or OPEN).
   * Enforces unique sequence per movement via DB UNIQUE KEY.
   */
  static async addCheckpoint(
    routeUuid: string,
    params: { sequence: number; name: string; neighborhoodId?: number; eta?: string }
  ): Promise<number> {
    const [routes] = await db.execute<RowDataPacket[]>(
      `SELECT fm.id, fm.status FROM fleet_movements fm
       WHERE fm.uuid = ? AND fm.movement_type = 'ROUTE'`,
      [routeUuid]
    );
    if (routes.length === 0) throw new Error('Route not found');
    const movementId = routes[0].id as number;

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO fleet_route_checkpoints (movement_id, sequence, name, neighborhood_id, eta)
       VALUES (?, ?, ?, ?, ?)`,
      [movementId, params.sequence, params.name, params.neighborhoodId ?? null, params.eta ?? null]
    );
    return (result as ResultSetHeader).insertId;
  }

  /**
   * Returns all checkpoints for a route, ordered by sequence ASC.
   */
  static async getCheckpoints(routeUuid: string): Promise<RowDataPacket[]> {
    const [routes] = await db.execute<RowDataPacket[]>(
      `SELECT fm.id FROM fleet_movements fm
       WHERE fm.uuid = ? AND fm.movement_type = 'ROUTE'`,
      [routeUuid]
    );
    if (routes.length === 0) throw new Error('Route not found');
    const movementId = routes[0].id as number;

    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT id, movement_id, sequence, name, neighborhood_id, eta, arrived_at, status, created_at
       FROM fleet_route_checkpoints
       WHERE movement_id = ?
       ORDER BY sequence ASC`,
      [movementId]
    );
    return rows;
  }

  /**
   * Marks a checkpoint as VISITED with arrived_at = NOW().
   */
  static async arriveAtCheckpoint(routeUuid: string, checkpointId: number): Promise<void> {
    const [routes] = await db.execute<RowDataPacket[]>(
      `SELECT fm.id FROM fleet_movements fm
       WHERE fm.uuid = ? AND fm.movement_type = 'ROUTE'`,
      [routeUuid]
    );
    if (routes.length === 0) throw new Error('Route not found');
    const movementId = routes[0].id as number;

    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE fleet_route_checkpoints
       SET status = 'VISITED', arrived_at = NOW()
       WHERE id = ? AND movement_id = ? AND status = 'PENDING'`,
      [checkpointId, movementId]
    );
    if ((result as ResultSetHeader).affectedRows === 0)
      throw new Error('Checkpoint not found or already visited');
  }

  /**
   * Fetches incidents for a specific route UUID.
   */
  static async getIncidents(routeUuid: string): Promise<RowDataPacket[]> {
    // FC 082 F2b3b — read cutover final: cc.code única fuente (ENUM dropeado);
    // category_id se expone de forma aditiva (Cond del dictamen Bravo 18:01:49).
    const [rows] = await db.execute<RowDataPacket[]>(
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

  /**
   * Fetches all incidents across the fleet.
   */
  static async getAllIncidents(ownerIds?: number[]): Promise<RowDataPacket[]> {
    const scopeFilter =
      ownerIds && ownerIds.length > 0
        ? `AND fu.ownerId IN (${ownerIds.map(() => '?').join(', ')})`
        : '';
    // FC 082 F2b3b — read cutover final: cc.code única fuente (ENUM dropeado);
    // category_id aditivo.
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

    const [rows] = await db.execute<RowDataPacket[]>(
      query,
      ownerIds && ownerIds.length > 0 ? ownerIds : undefined
    );
    return rows;
  }

  /**
   * Updates a route entry (split across fleet_movements + fleet_route_extensions) with forensic audit.
   */
  static async updateRoute(
    uuid: string,
    data: Partial<RouteEntry>,
    reason: string,
    adminId: number
  ): Promise<void> {
    if (!uuid) throw new Error('Missing route UUID for update');

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Get full snapshot before (joined)
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT fm.*, fre.driver_id, fre.origin_id, fre.destination_neighborhood_id,
                fre.destination, fre.additives_check, fre.tire_pressure_json, fre.checklist_json
         FROM fleet_movements fm
         JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
         WHERE fm.uuid = ? FOR UPDATE`,
        [uuid]
      );
      if (rows.length === 0) throw new Error('Route not found');
      const snapshotBefore = rows[0];

      // 2. Resolve destination if neighborhoodId is being updated
      if (data.destinationNeighborhoodId !== undefined && data.destinationNeighborhoodId) {
        const [coloniaRows] = await connection.execute<RowDataPacket[]>(
          `SELECT c.name AS neighborhood, m.name AS municipality, e.name AS state
           FROM neighborhoods c
           JOIN municipalities m ON c.municipality_id = m.id
           JOIN states e ON m.state_id = e.id
           WHERE c.id = ?`,
          [data.destinationNeighborhoodId]
        );
        if (coloniaRows.length > 0) {
          const row = coloniaRows[0];
          const suffix = `${row.neighborhood}, ${row.municipality}, ${row.state}`;
          const inputDest = data.destination || '';
          if (inputDest && inputDest !== suffix) {
            const parts = inputDest.split(row.neighborhood);
            const prefix = parts[0].trim().replace(/,\s*$/, '');
            data.destination = prefix ? `${prefix}, ${suffix}` : suffix;
          } else {
            data.destination = suffix;
          }
        }
      }

      // 3. Telemetry validation
      const nextStartReading = data.startReading ?? snapshotBefore.start_reading;
      const nextEndReading = data.endReading ?? snapshotBefore.end_reading;
      if (nextEndReading !== null && nextEndReading < nextStartReading) {
        throw new Error(
          `Telemetry Disparity: End reading (${nextEndReading} KM) cannot be lower than start reading (${nextStartReading} KM).`
        );
      }

      // 4. Split fields between fleet_movements and fleet_route_extensions
      const movementColumnMap: Record<string, string> = {
        unitId: 'unit_id',
        status: 'status',
        startReading: 'start_reading',
        endReading: 'end_reading',
        fuelLevel: snapshotBefore.status === 'ACTIVE' ? 'fuel_level_start' : 'fuel_level_end',
        fuelLitersLoaded: 'fuel_liters_loaded',
        fuelAmount: 'fuel_amount',
        fuelTicketImage: 'fuel_ticket_image',
        description: 'description',
      };

      const extensionColumnMap: Record<string, string> = {
        operatorId: 'driver_id',
        originId: 'origin_id',
        destinationNeighborhoodId: 'destination_neighborhood_id',
        destination: 'destination',
        additivesCheck: 'additives_check',
        tirePressureJson: 'tire_pressure_json',
        checklistJson: 'checklist_json',
      };

      const movementFields: string[] = [];
      const movementValues: unknown[] = [];
      const extensionFields: string[] = [];
      const extensionValues: unknown[] = [];

      Object.entries(data).forEach(([key, value]) => {
        if (movementColumnMap[key]) {
          movementFields.push(`${movementColumnMap[key]} = ?`);
          movementValues.push(value);
        } else if (extensionColumnMap[key]) {
          extensionFields.push(`${extensionColumnMap[key]} = ?`);
          extensionValues.push(key === 'additivesCheck' ? (value ? 1 : 0) : value);
        }
      });

      if (movementFields.length > 0) {
        await connection.execute(
          `UPDATE fleet_movements SET ${movementFields.join(', ')} WHERE uuid = ?`,
          [...movementValues, uuid]
        );
      }

      if (extensionFields.length > 0) {
        await connection.execute(
          `UPDATE fleet_route_extensions SET ${extensionFields.join(', ')} WHERE movement_id = ?`,
          [...extensionValues, snapshotBefore.id]
        );
      }

      // 5. Get snapshot after (joined)
      const [rowsAfter] = await connection.execute<RowDataPacket[]>(
        `SELECT fm.*, fre.driver_id, fre.origin_id, fre.destination_neighborhood_id,
                fre.destination, fre.additives_check, fre.tire_pressure_json, fre.checklist_json
         FROM fleet_movements fm
         JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
         WHERE fm.uuid = ?`,
        [uuid]
      );
      const snapshotAfter = rowsAfter[0];

      // 6. Forensic audit log
      await recordAuditLog({
        entity_type: 'route_log',
        entity_id: uuid,
        action: 'UPDATE',
        snapshot_before: snapshotBefore,
        snapshot_after: snapshotAfter,
        reason,
        user_id: adminId,
      });

      // 7. Chain of Custody: propagate telemetry to unit
      await this.syncUnitState(connection, snapshotAfter.unit_id);

      await connection.commit();
      connection.release();
    } catch (e) {
      await connection.rollback();
      connection.release();
      const msg = e instanceof Error ? e.message : 'Unknown database error';
      throw new Error(`Forensic Update Failure: ${msg}`);
    }
  }

  /**
   * Deletes a route movement (cascades to fleet_route_extensions) with forensic audit.
   */
  static async deleteRoute(uuid: string, reason: string, adminId: number): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Get snapshot before
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT fm.*, fre.driver_id FROM fleet_movements fm
         JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
         WHERE fm.uuid = ? FOR UPDATE`,
        [uuid]
      );
      if (rows.length === 0) throw new Error('Route not found');
      const snapshotBefore = rows[0];

      // 2. Delete base record (CASCADE removes fleet_route_extensions)
      await connection.execute('DELETE FROM fleet_movements WHERE uuid = ?', [uuid]);

      // 3. Forensic audit log
      await recordAuditLog({
        entity_type: 'route_log',
        entity_id: uuid,
        action: 'DELETE',
        snapshot_before: snapshotBefore,
        reason,
        user_id: adminId,
      });

      // 4. Chain of Custody: recalculate unit state
      await this.syncUnitState(connection, snapshotBefore.unit_id);

      await connection.commit();
      connection.release();
    } catch (e) {
      await connection.rollback();
      connection.release();
      throw e;
    }
  }
}

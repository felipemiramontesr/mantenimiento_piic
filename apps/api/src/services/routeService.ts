import { RowDataPacket, PoolConnection } from 'mysql2';
import { randomUUID } from 'node:crypto';
import db from './db';
import { recordAuditLog } from './auditService';

/**
 * 🔱 Archon RouteService
 * Handles journey lifecycles and their sovereign impact on fleet units.
 */
export type RouteStatus = 'OPEN' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface RouteEntry {
  id?: number;
  uuid: string;
  unit_id: string;
  driver_id: number;
  origin_id?: number;
  destination: string;
  status: RouteStatus;
  start_reading: number;
  end_reading?: number;
  start_at?: Date;
  end_at?: Date;
  fuel_level_start: number;
  fuel_level_end?: number;
  fuel_liters_loaded?: number;
  fuel_ticket_image?: string;
  additives_check?: boolean;
  tire_pressure_json?: string;
  checklist_json?: string;
}

export default class RouteService {
  /**
   * Internal helper to synchronize the unit's odometer and fuel with the latest journey data.
   */
  private static async syncUnitState(connection: PoolConnection, unitId: string): Promise<void> {
    if (!unitId) return;

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT end_reading, fuel_level_end 
       FROM fleet_routes 
       WHERE unit_id = ? AND status = 'COMPLETED' 
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
   * Starts a journey: Atomic transaction impacting unit and logs.
   */
  static async startRoute(
    unitId: string,
    driverId: number,
    startReading: number,
    fuelLevelStart: number,
    destination: string,
    originId?: number
  ): Promise<string> {
    const connection = await db.getConnection();
    const routeUuid = randomUUID();

    try {
      await connection.beginTransaction();

      // 1. Validate Unit availability
      const [units] = await connection.execute<RowDataPacket[]>(
        'SELECT status, odometer FROM fleet_units WHERE id = ? FOR UPDATE',
        [unitId]
      );

      if (units.length === 0) throw new Error(`Unit ${unitId} not found`);
      if (units[0].status === 'En Ruta') throw new Error(`Unit ${unitId} is already in transit`);
      if (startReading < units[0].odometer) {
        throw new Error(
          `Start reading (${startReading} KM) cannot be lower than the unit's current odometer (${units[0].odometer} KM)`
        );
      }

      // 2. Create the Route
      await connection.execute(
        `INSERT INTO fleet_routes 
        (uuid, unit_id, driver_id, origin_id, destination, status, start_reading, fuel_level_start, start_at) 
        VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, NOW())`,
        [routeUuid, unitId, driverId, originId || null, destination, startReading, fuelLevelStart]
      );

      // 3. Update Unit Status (Impact)
      await connection.execute('UPDATE fleet_units SET status = "En Ruta" WHERE id = ?', [unitId]);

      // 4. Create Impact Log
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
   * Completes a journey: Updates odometer, status and records forensics.
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
    } = params;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Get Route and Unit Context
      const [routes] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM fleet_routes WHERE uuid = ? FOR UPDATE',
        [routeUuid]
      );

      if (routes.length === 0) throw new Error('Route not found');
      const route = routes[0];
      if (route.status !== 'ACTIVE') throw new Error('Route is not active');
      if (endReading < route.start_reading) {
        throw new Error('End reading cannot be lower than start reading');
      }

      // 2. Update Route
      await connection.execute(
        `UPDATE fleet_routes 
        SET status = 'COMPLETED', end_reading = ?, end_at = NOW(), 
            fuel_level_end = ?, fuel_liters_loaded = ?, fuel_amount = ?, fuel_ticket_image = ?,
            additives_check = ?, tire_pressure_json = ?, checklist_json = ?
        WHERE uuid = ?`,
        [
          endReading,
          fuelLevelEnd,
          fuelLiters,
          fuelAmount,
          fuelImage || null,
          additivesCheck,
          tirePressureJson || null,
          checklistJson || null,
          routeUuid,
        ]
      );

      // 3. Update Unit (The massive impact)
      await connection.execute(
        'UPDATE fleet_units SET odometer = ?, lastFuelLevel = ?, status = "Disponible" WHERE id = ?',
        [endReading, fuelLevelEnd, route.unit_id]
      );

      // 4. Create Final Log
      await connection.execute(
        `INSERT INTO unit_activity_logs 
        (uuid, unit_id, event_type, reference_id, reading_before, reading_after, status_before, status_after, created_by) 
        VALUES (?, ?, 'ROUTE_FINISH', ?, ?, ?, 'En Ruta', 'Disponible', ?)`,
        [randomUUID(), route.unit_id, routeUuid, route.start_reading, endReading, route.driver_id]
      );

      await connection.commit();
      connection.release();
    } catch (e) {
      await connection.rollback();
      connection.release();
      throw e;
    }
  }

  /**
   * Fetches active route for a unit
   */
  static async getActiveRoute(unitId: string): Promise<RouteEntry | null> {
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT * FROM fleet_routes WHERE unit_id = ? AND status = "ACTIVE" LIMIT 1',
      [unitId]
    );
    return rows.length > 0 ? (rows[0] as RouteEntry) : null;
  }

  /**
   * Records an incident during a journey
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

      // 1. Get Route context
      const [routes] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM fleet_routes WHERE uuid = ?',
        [routeUuid]
      );
      if (routes.length === 0) throw new Error('Route not found');
      const route = routes[0];

      // 2. Insert Incident
      await connection.execute(
        `INSERT INTO route_incidents 
        (route_uuid, category, description, severity, evidence_image, status) 
        VALUES (?, ?, ?, ?, ?, 'OPEN')`,
        [routeUuid, category, description, severity, evidenceImage || null]
      );

      // 3. Determine if unit status needs to change (Industrial Safety Protocol)
      let nextStatus = route.status === 'ACTIVE' ? 'En Ruta' : 'Disponible';
      if (severity === 'CRITICAL') {
        nextStatus = 'En Mantenimiento';
      } else if (category === 'SINIESTRO') {
        nextStatus = 'Descontinuada';
      }

      // 4. Log the incident in the forensic journal
      await connection.execute(
        `INSERT INTO unit_activity_logs 
        (uuid, unit_id, event_type, reference_id, reading_before, status_before, status_after, description, created_by) 
        VALUES (?, ?, 'ROUTE_INCIDENT', ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          route.unit_id,
          routeUuid,
          route.start_reading,
          route.status === 'ACTIVE' ? 'En Ruta' : 'Disponible',
          nextStatus,
          `${category}: ${description.substring(0, 100)}`,
          route.driver_id,
        ]
      );

      // 5. Apply unit status impact if necessary
      if (nextStatus !== (route.status === 'ACTIVE' ? 'En Ruta' : 'Disponible')) {
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
   * Fetches incidents for a specific route
   */
  static async getIncidents(routeUuid: string): Promise<RowDataPacket[]> {
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT * FROM route_incidents WHERE route_uuid = ? ORDER BY reported_at DESC',
      [routeUuid]
    );
    return rows;
  }

  /**
   * Fetches all incidents across the fleet
   */
  static async getAllIncidents(): Promise<RowDataPacket[]> {
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT 
        i.*, 
        r.unit_id, 
        u.full_name as driver_name 
      FROM route_incidents i 
      JOIN fleet_routes r ON i.route_uuid = r.uuid 
      JOIN users u ON r.driver_id = u.id 
      ORDER BY i.reported_at DESC`
    );
    return rows;
  }

  /**
   * Updates a route entry with forensic audit.
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

      // 1. Get snapshot before
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM fleet_routes WHERE uuid = ? FOR UPDATE',
        [uuid]
      );
      if (rows.length === 0) throw new Error('Route not found');
      const snapshotBefore = rows[0];

      // 2. Perform Update with Column Mapping (Frontend camelCase -> DB snake_case)
      const columnMap: Record<string, string> = {
        unitId: 'unit_id',
        operatorId: 'driver_id',
        originId: 'origin_id',
        destination: 'destination',
        status: 'status',
        startReading: 'start_reading',
        endReading: 'end_reading',
        fuelLevel: snapshotBefore.status === 'ACTIVE' ? 'fuel_level_start' : 'fuel_level_end',
        fuelLitersLoaded: 'fuel_liters_loaded',
        fuelAmount: 'fuel_amount',
        fuelTicketImage: 'fuel_ticket_image',
        additivesCheck: 'additives_check',
        tirePressureJson: 'tire_pressure_json',
        checklistJson: 'checklist_json',
      };

      const fieldsToUpdate: string[] = [];
      const values: unknown[] = [];

      // 2.1 Enforce telemetry logic (Failsafe)
      const nextStartReading = data.startReading ?? snapshotBefore.start_reading;
      const nextEndReading = data.endReading ?? snapshotBefore.end_reading;

      if (nextEndReading !== null && nextEndReading < nextStartReading) {
        throw new Error(
          `Telemetry Disparity: End reading (${nextEndReading} KM) cannot be lower than start reading (${nextStartReading} KM).`
        );
      }

      Object.entries(data).forEach(([key, value]) => {
        const column = columnMap[key];
        if (column) {
          fieldsToUpdate.push(`${column} = ?`);
          // Special handling for booleans/numeric types if necessary
          if (key === 'additivesCheck') {
            values.push(value ? 1 : 0);
          } else {
            values.push(value);
          }
        }
      });

      if (fieldsToUpdate.length > 0) {
        await connection.execute(
          `UPDATE fleet_routes SET ${fieldsToUpdate.join(', ')} WHERE uuid = ?`,
          [...values, uuid]
        );
      }

      // 3. Get snapshot after
      const [rowsAfter] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM fleet_routes WHERE uuid = ?',
        [uuid]
      );
      const snapshotAfter = rowsAfter[0];

      // 4. Record Audit Log
      await recordAuditLog({
        entity_type: 'route_log',
        entity_id: uuid,
        action: 'UPDATE',
        snapshot_before: snapshotBefore,
        snapshot_after: snapshotAfter,
        reason,
        user_id: adminId,
      });

      // 5. Chain of Custody (X=Y Protocol): Propagate changes to Unit if this is the most recent reading
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
   * Deletes a route entry with forensic audit.
   */
  static async deleteRoute(uuid: string, reason: string, adminId: number): Promise<void> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Get snapshot before
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM fleet_routes WHERE uuid = ? FOR UPDATE',
        [uuid]
      );
      if (rows.length === 0) throw new Error('Route not found');
      const snapshotBefore = rows[0];

      // 2. Perform Delete
      await connection.execute('DELETE FROM fleet_routes WHERE uuid = ?', [uuid]);

      // 3. Record Audit Log
      await recordAuditLog({
        entity_type: 'route_log',
        entity_id: uuid,
        action: 'DELETE',
        snapshot_before: snapshotBefore,
        reason,
        user_id: adminId,
      });

      // 4. Chain of Custody: Recalculate unit state in case we deleted the latest record
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

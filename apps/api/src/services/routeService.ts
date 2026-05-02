import { RowDataPacket } from 'mysql2';
import { randomUUID } from 'node:crypto';
import db from './db';

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
  fuel_liters_loaded?: number;
  fuel_ticket_image?: string;
}

export default class RouteService {
  /**
   * Starts a journey: Atomic transaction impacting unit and logs.
   */
  static async startRoute(
    unitId: string,
    driverId: number,
    startReading: number,
    destination: string,
    originId?: number
  ): Promise<string> {
    const connection = await db.getConnection();
    const routeUuid = randomUUID();

    try {
      await connection.beginTransaction();

      // 1. Validate Unit availability
      const [units] = await connection.execute<RowDataPacket[]>(
        'SELECT status, currentReading FROM fleet_units WHERE id = ? FOR UPDATE',
        [unitId]
      );

      if (units.length === 0) throw new Error(`Unit ${unitId} not found`);
      if (units[0].status === 'En Ruta') throw new Error(`Unit ${unitId} is already in transit`);

      // 2. Create the Route
      await connection.execute(
        `INSERT INTO fleet_routes 
        (uuid, unit_id, driver_id, origin_id, destination, status, start_reading, start_at) 
        VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, NOW())`,
        [routeUuid, unitId, driverId, originId || null, destination, startReading]
      );

      // 3. Update Unit Status (Impact)
      await connection.execute('UPDATE fleet_units SET status = "En Ruta" WHERE id = ?', [unitId]);

      // 4. Create Impact Log
      await connection.execute(
        `INSERT INTO unit_activity_logs 
        (unit_id, event_type, reference_id, reading_before, status_before, status_after, created_by) 
        VALUES (?, 'ROUTE_START', ?, ?, ?, 'En Ruta', ?)`,
        [unitId, routeUuid, units[0].currentReading, units[0].status, driverId]
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
    endReading: number,
    fuelImage?: string,
    fuelLiters = 0
  ): Promise<void> {
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
            fuel_liters_loaded = ?, fuel_ticket_image = ? 
        WHERE uuid = ?`,
        [endReading, fuelLiters, fuelImage || null, routeUuid]
      );

      // 3. Update Unit (The massive impact)
      await connection.execute(
        'UPDATE fleet_units SET currentReading = ?, status = "Disponible" WHERE id = ?',
        [endReading, route.unit_id]
      );

      // 4. Create Final Log
      await connection.execute(
        `INSERT INTO unit_activity_logs 
        (unit_id, event_type, reference_id, reading_before, reading_after, status_before, status_after, created_by) 
        VALUES (?, 'ROUTE_FINISH', ?, ?, ?, 'En Ruta', 'Disponible', ?)`,
        [route.unit_id, routeUuid, route.start_reading, endReading, route.driver_id]
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
    return rows.length > 0 ? rows[0] : null;
  }
}

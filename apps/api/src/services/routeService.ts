/* eslint-disable */
// @ts-nocheck
import { PoolConnection } from 'mysql2';
import { randomUUID } from 'node:crypto';
import db from './db';
import { recordAuditLog } from './auditService';
import { UNIT_STATUS, MOVEMENT_STATUS } from '../constants/statuses';
import { resolveCatalogId } from './catalogMapper';
import * as RouteMovementsRepository from './routeMovements.repository';
import * as RouteIncidentsRepository from './routeIncidents.repository';
import * as RouteRoutesRepository from './routeRoutes.repository';
import { resolveOwnerScope } from './ownerScopeResolver';

/**
 * 🔱 Archon RouteService — CTI Architecture (V2)
 * All journey data lives in fleet_movements (base) + fleet_route_extensions (child).
 * FC126 F1 — zero-SQL (I2): every data access delegates to the 3 repository
 * modules (I3), split by origin — `routeMovements.repository.ts` (start/
 * finish/update/delete a route + odometer sync), `routeIncidents.repository.ts`
 * (active-route/incidents/checkpoints), `routeRoutes.repository.ts` (queries
 * that originate directly in `routes/fleetRoutes.ts` — ownership scope,
 * listings, node views). Split was mechanical (Gate 1 max-lines:400 on the
 * original monolithic file), not a domain boundary — all 3 share the same
 * `Pool | PoolConnection` executor pattern. Transaction boundaries
 * (getConnection/beginTransaction/commit/rollback/release) stay here — that's
 * orchestration, not persistence — the repositories only ever receive the
 * already-open `connection` to run their parametrized SQL against.
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

    const lastRoute = await RouteMovementsRepository.findLastCompletedRoute(unitId, connection);

    if (lastRoute) {
      await RouteMovementsRepository.updateUnitOdometerAndFuel(
        unitId,
        lastRoute.end_reading,
        lastRoute.fuel_level_end,
        connection
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
      const unit = await RouteMovementsRepository.findUnitStatusForUpdate(unitId, connection);

      if (!unit) throw new Error(`Unit ${unitId} not found`);
      if (unit.status === UNIT_STATUS.IN_ROUTE)
        throw new Error(`Unit ${unitId} is already in transit`);
      if (unit.status === 'Downtime') throw new Error(`Unit ${unitId} is under maintenance`);
      if (startReading < unit.odometer) {
        throw new Error(
          `Start reading (${startReading} KM) cannot be lower than the unit's current odometer (${unit.odometer} KM)`
        );
      }

      // 1.1 Resolve destination via neighborhood catalog if ID provided
      let finalDestination = destination;
      if (destinationNeighborhoodId) {
        const row = await RouteMovementsRepository.findNeighborhoodLabel(
          destinationNeighborhoodId,
          connection
        );
        if (row) {
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
      const movementId = await RouteMovementsRepository.insertRouteMovement(
        { uuid: routeUuid, unitId, startReading, fuelLevelStart, description },
        connection
      );

      // 3. Insert CTI route extension
      await RouteMovementsRepository.insertRouteExtension(
        {
          movementId,
          driverId,
          originId,
          destinationNeighborhoodId,
          destination: finalDestination,
        },
        connection
      );

      // 4. Update unit status
      await RouteMovementsRepository.updateUnitStatusToEnRuta(unitId, connection);

      // 5. Forensic log
      await RouteMovementsRepository.insertRouteStartActivityLog(
        {
          logUuid: randomUUID(),
          unitId,
          routeUuid,
          readingBefore: unit.odometer,
          statusBefore: unit.status,
          createdBy: driverId,
        },
        connection
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
      const route = await RouteMovementsRepository.findRouteForUpdateByUuid(routeUuid, connection);

      if (!route) throw new Error('Route not found');
      if (route.status !== 'ACTIVE') throw new Error('Route is not active');
      if (endReading < route.start_reading) {
        throw new Error('End reading cannot be lower than start reading');
      }

      // 2. Update movement (telemetry fields)
      await RouteMovementsRepository.updateRouteMovementCompletion(
        routeUuid,
        { endReading, fuelLevelEnd, fuelLiters, fuelAmount, fuelImage, description },
        connection
      );

      // 3. Update route extension (logistics fields)
      await RouteMovementsRepository.updateRouteExtensionLogistics(
        route.id,
        { additivesCheck, tirePressureJson, checklistJson },
        connection
      );

      // 4. Update unit
      await RouteMovementsRepository.updateUnitTelemetryOnFinish(
        route.unit_id,
        endReading,
        fuelLevelEnd,
        connection
      );

      // 5. Forensic log
      await RouteMovementsRepository.insertRouteFinishActivityLog(
        {
          logUuid: randomUUID(),
          unitId: route.unit_id,
          routeUuid,
          readingBefore: route.start_reading,
          readingAfter: endReading,
          createdBy: route.driver_id,
        },
        connection
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
        await RouteMovementsRepository.insertFuelTransactionIfAbsent(
          {
            unitId: route.unit_id,
            categoryId: fuelCategoryId,
            amount: fuelAmount,
            period,
            sourceId: autoSourceId,
            sourceUuid: routeUuid,
            notes: `Combustible + insumos ruta — ${routeUuid}`,
            createdBy: route.driver_id,
          },
          connection
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
    const row = await RouteIncidentsRepository.findActiveRouteByUnit(unitId);
    return row ? (row as RouteEntry) : null;
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
      const route = await RouteIncidentsRepository.findRouteWithDriverByUuid(routeUuid, connection);
      if (!route) throw new Error('Route not found');

      // 2. Insert incident
      // FC 082 F2b3a — cutover de escritura: category_id es la única fuente
      // de verdad (ENUM ya nullable desde F2b3a-pre, mig.168). `category`
      // (el parámetro) sigue usándose para el branch de negocio de abajo y
      // la notificación — solo la columna DB deja de escribirse.
      const categoryId = await resolveCatalogId('INCIDENT_CATEGORY', category, connection);
      await RouteIncidentsRepository.insertIncident(
        { routeUuid, categoryId, description, severity, evidenceImage },
        connection
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
      const statusBefore =
        route.status === MOVEMENT_STATUS.ACTIVE ? UNIT_STATUS.IN_ROUTE : UNIT_STATUS.AVAILABLE;
      await RouteIncidentsRepository.insertIncidentActivityLog(
        {
          logUuid: randomUUID(),
          unitId: route.unit_id,
          routeUuid,
          readingBefore: route.start_reading,
          statusBefore,
          statusAfter: nextStatus,
          description: `${category}: ${description.substring(0, 100)}`,
          createdBy: route.driver_id,
        },
        connection
      );

      // 5. Apply unit status impact if it changed
      if (nextStatus !== statusBefore) {
        await RouteIncidentsRepository.updateUnitStatusForIncident(
          route.unit_id,
          nextStatus,
          connection
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
   * Adds a checkpoint to an existing route (ACTIVE or OPEN).
   * Enforces unique sequence per movement via DB UNIQUE KEY.
   */
  static async addCheckpoint(
    routeUuid: string,
    params: { sequence: number; name: string; neighborhoodId?: number; eta?: string }
  ): Promise<number> {
    const route = await RouteIncidentsRepository.findRouteIdByUuid(routeUuid);
    if (!route) throw new Error('Route not found');

    return RouteIncidentsRepository.insertCheckpoint({
      movementId: route.id,
      sequence: params.sequence,
      name: params.name,
      neighborhoodId: params.neighborhoodId ?? null,
      eta: params.eta ?? null,
    });
  }

  /**
   * Returns all checkpoints for a route, ordered by sequence ASC.
   */
  static async getCheckpoints(routeUuid: string) {
    const route = await RouteIncidentsRepository.findRouteIdByUuid(routeUuid);
    if (!route) throw new Error('Route not found');

    return RouteIncidentsRepository.listCheckpointsByMovementId(route.id);
  }

  /**
   * Marks a checkpoint as VISITED with arrived_at = NOW().
   */
  static async arriveAtCheckpoint(routeUuid: string, checkpointId: number): Promise<void> {
    const route = await RouteIncidentsRepository.findRouteIdByUuid(routeUuid);
    if (!route) throw new Error('Route not found');

    const affectedRows = await RouteIncidentsRepository.markCheckpointVisited(
      checkpointId,
      route.id
    );
    if (affectedRows === 0) throw new Error('Checkpoint not found or already visited');
  }

  /**
   * Fetches incidents for a specific route UUID.
   */
  static async getIncidents(routeUuid: string) {
    return RouteIncidentsRepository.listIncidentsByRouteUuid(routeUuid);
  }

  /**
   * Fetches all incidents across the fleet.
   */
  static async getAllIncidents(ownerIds?: number[]) {
    return RouteIncidentsRepository.listAllIncidents(ownerIds);
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
      const snapshotBefore = await RouteMovementsRepository.findRouteSnapshotForUpdate(
        uuid,
        connection
      );
      if (!snapshotBefore) throw new Error('Route not found');

      // 2. Resolve destination if neighborhoodId is being updated
      if (data.destinationNeighborhoodId !== undefined && data.destinationNeighborhoodId) {
        const row = await RouteMovementsRepository.findNeighborhoodLabel(
          data.destinationNeighborhoodId,
          connection
        );
        if (row) {
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
        await RouteMovementsRepository.updateRouteMovementFields(
          uuid,
          movementFields.join(', '),
          movementValues,
          connection
        );
      }

      if (extensionFields.length > 0) {
        await RouteMovementsRepository.updateRouteExtensionFields(
          snapshotBefore.id,
          extensionFields.join(', '),
          extensionValues,
          connection
        );
      }

      // 5. Get snapshot after (joined)
      const snapshotAfter = await RouteMovementsRepository.findRouteSnapshotByUuid(
        uuid,
        connection
      );

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
      const snapshotBefore = await RouteMovementsRepository.findRouteWithDriverForUpdateByUuid(
        uuid,
        connection
      );
      if (!snapshotBefore) throw new Error('Route not found');

      // 2. Delete base record (CASCADE removes fleet_route_extensions)
      await RouteMovementsRepository.deleteRouteByUuid(uuid, connection);

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

  // FC126 F1 (Cond.R-126-S1) — ownership scope, centralized here instead of
  // ad-hoc in routes/fleetRoutes.ts. FC138 F1 (Cond.R-138-H3) — delegates to
  // the shared SSOT in `ownerScopeResolver.ts` (same T2 prescrita, 127_AN
  // Bravo) so this stops being a second copy of the same security-critical
  // logic; `finance.service.ts` (H2) uses the same helper directly.
  static resolveOwnerScope(user: {
    id: number;
    permissions?: string[];
    tenant_id?: number | null;
  }): Promise<number[] | null> {
    return resolveOwnerScope(user);
  }

  static async checkRouteScope(uuid: string, ownerScope: number[] | null): Promise<boolean> {
    if (ownerScope === null) return true;
    const ownerId = await RouteRoutesRepository.findRouteOwnerByUuid(uuid);
    if (ownerId === null) return false;
    return ownerScope.includes(ownerId);
  }

  static async checkIncidentScope(uuid: string, ownerScope: number[] | null): Promise<boolean> {
    if (ownerScope === null) return true;
    const ownerId = await RouteRoutesRepository.findIncidentOwnerByUuid(uuid);
    if (ownerId === null) return false;
    return ownerScope.includes(ownerId);
  }

  static async checkUnitScope(unitId: string, ownerScope: number[] | null): Promise<boolean> {
    if (ownerScope === null) return true;
    const ownerId = await RouteRoutesRepository.findUnitOwner(unitId);
    if (ownerId === null) return false;
    return ownerScope.includes(ownerId);
  }

  static async listRoutes(ownerScope: number[] | null) {
    return RouteRoutesRepository.listRoutesForOwnerScope(ownerScope);
  }

  static async listUnitActivityLogs(ownerScope: number[] | null) {
    return RouteRoutesRepository.listUnitActivityLogsForOwnerScope(ownerScope);
  }

  static async getRouteNode(uuid: string) {
    const route = await RouteRoutesRepository.findRouteNodeByUuid(uuid);
    if (!route) return null;
    const incidents = await RouteRoutesRepository.findRouteNodeIncidents(uuid);
    return { route, incidents };
  }

  static async getIncidentNode(uuid: string) {
    return RouteRoutesRepository.findIncidentNodeByUuid(uuid);
  }
}

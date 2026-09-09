import { RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import db from './db';
import { recordAuditLog } from './auditService';
import { UNIT_STATUS, MOVEMENT_STATUS, UnitStatusValue } from '../constants/statuses';
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

export interface StartRouteOptions {
  originId?: number;
  description?: string;
  destinationNeighborhoodId?: number;
}

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

/**
 * Forma real del body de PUT /v1/routes/:uuid (FC 076 F4, `routeUpdateSchema`
 * en packages/contracts es un `z.record(z.any())` deliberadamente laxo — el
 * frontend envía un subconjunto camelCase arbitrario, remapeado más abajo a
 * columnas snake_case vía `movementColumnMap`/`extensionColumnMap`). NO es
 * `Partial<RouteEntry>` (ese tipo describe las columnas snake_case ya
 * persistidas, una forma distinta) — usar ese tipo aquí hacía que
 * `data.destinationNeighborhoodId`/`startReading`/`endReading` fueran
 * inalcanzables para TypeScript aunque el runtime SÍ los lee correctamente
 * (confirmado contra el caller real, `routeAssignmentActions.ts`).
 */
interface RouteUpdateData {
  destinationNeighborhoodId?: number | null;
  destination?: string;
  startReading?: number;
  endReading?: number | null;
  [key: string]: unknown;
}

/** Valor SQL-parametrizable de `splitUpdateFields` (FC166 Track D S4323 —
 * alias en vez de repetir la unión en cada firma que lo usa). */
type RouteSqlValue = string | number | boolean | null;

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

  private static validateUnitForRoute(
    unit: RowDataPacket | null,
    unitId: string,
    startReading: number
  ): void {
    if (!unit) throw new Error(`Unit ${unitId} not found`);
    if (unit.status === UNIT_STATUS.IN_ROUTE)
      throw new Error(`Unit ${unitId} is already in transit`);
    if (unit.status === 'Downtime') throw new Error(`Unit ${unitId} is under maintenance`);
    if (startReading < unit.odometer) {
      throw new Error(
        `Start reading (${startReading} KM) cannot be lower than the unit's current odometer (${unit.odometer} KM)`
      );
    }
  }

  private static async resolveDestinationSuffix(
    destination: string,
    destinationNeighborhoodId: number | undefined,
    connection: PoolConnection
  ): Promise<string> {
    if (!destinationNeighborhoodId) return destination;
    const row = await RouteMovementsRepository.findNeighborhoodLabel(
      destinationNeighborhoodId,
      connection
    );
    if (!row) return destination;
    const suffix = `${row.neighborhood}, ${row.municipality}, ${row.state}`;
    if (destination && destination !== suffix) {
      const parts = destination.split(row.neighborhood);
      const prefix = parts[0].trim().replace(/,\s*$/, '');
      return prefix ? `${prefix}, ${suffix}` : suffix;
    }
    return suffix;
  }

  private static async persistRouteRecords(
    params: {
      routeUuid: string;
      unitId: string;
      driverId: number;
      startReading: number;
      fuelLevelStart: number;
      finalDestination: string;
      unit: RowDataPacket;
      options?: StartRouteOptions;
    },
    connection: PoolConnection
  ): Promise<void> {
    const {
      routeUuid,
      unitId,
      driverId,
      startReading,
      fuelLevelStart,
      finalDestination,
      unit,
      options,
    } = params;
    const movementId = await RouteMovementsRepository.insertRouteMovement(
      { uuid: routeUuid, unitId, startReading, fuelLevelStart, description: options?.description },
      connection
    );
    await RouteMovementsRepository.insertRouteExtension(
      {
        movementId,
        driverId,
        originId: options?.originId,
        destinationNeighborhoodId: options?.destinationNeighborhoodId,
        destination: finalDestination,
      },
      connection
    );
    await RouteMovementsRepository.updateUnitStatusToEnRuta(unitId, connection);
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
    options?: StartRouteOptions
  ): Promise<string> {
    const connection = await db.getConnection();
    const routeUuid = randomUUID();

    try {
      await connection.beginTransaction();

      const unit = await RouteMovementsRepository.findUnitStatusForUpdate(unitId, connection);
      this.validateUnitForRoute(unit, unitId, startReading);

      const finalDestination = await this.resolveDestinationSuffix(
        destination,
        options?.destinationNeighborhoodId,
        connection
      );

      await this.persistRouteRecords(
        {
          routeUuid,
          unitId,
          driverId,
          startReading,
          fuelLevelStart,
          finalDestination,
          unit: unit!,
          options,
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

      // 3-5. Status impact + bitácora forense + aplicación del cambio
      await RouteService.applyIncidentStatusImpact(
        route,
        routeUuid,
        category,
        description,
        severity,
        connection
      );

      await connection.commit();
      connection.release();
    } catch (e) {
      await connection.rollback();
      connection.release();
      throw e;
    }
  }

  /** Pasos 3-5 de `reportIncident` — determina el impacto de status
   * (Industrial Safety Protocol), registra la bitácora forense, y aplica el
   * cambio de status si corresponde. Extraída para respetar el cap de 50
   * líneas de Gate 2 (FC166 Track D); mismo comportamiento verbatim. */
  private static async applyIncidentStatusImpact(
    route: RowDataPacket,
    routeUuid: string,
    category: string,
    description: string,
    severity: string,
    connection: PoolConnection
  ): Promise<void> {
    let nextStatus: UnitStatusValue =
      route.status === MOVEMENT_STATUS.ACTIVE ? UNIT_STATUS.IN_ROUTE : UNIT_STATUS.AVAILABLE;
    if (severity === 'CRITICAL') {
      nextStatus = UNIT_STATUS.MAINTENANCE;
    } else if (category === 'SINIESTRO') {
      nextStatus = UNIT_STATUS.DISCONTINUED;
    }

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

    if (nextStatus !== statusBefore) {
      await RouteIncidentsRepository.updateUnitStatusForIncident(
        route.unit_id,
        nextStatus,
        connection
      );
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
  static async getCheckpoints(routeUuid: string): Promise<RowDataPacket[]> {
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
  static async getIncidents(routeUuid: string): Promise<RowDataPacket[]> {
    return RouteIncidentsRepository.listIncidentsByRouteUuid(routeUuid);
  }

  /**
   * Fetches all incidents across the fleet.
   */
  static async getAllIncidents(ownerIds?: number[]): Promise<RowDataPacket[]> {
    return RouteIncidentsRepository.listAllIncidents(ownerIds);
  }

  /**
   * Resuelve el campo `destination` textual cuando `destinationNeighborhoodId`
   * cambia (paso 2 de `updateRoute`, extraído por complejidad cognitiva).
   */
  private static async resolveDestination(
    data: RouteUpdateData,
    connection: PoolConnection
  ): Promise<string | undefined> {
    if (data.destinationNeighborhoodId === undefined || !data.destinationNeighborhoodId) {
      return data.destination;
    }
    const row = await RouteMovementsRepository.findNeighborhoodLabel(
      data.destinationNeighborhoodId,
      connection
    );
    if (!row) return data.destination;

    const suffix = `${row.neighborhood}, ${row.municipality}, ${row.state}`;
    const inputDest = data.destination || '';
    if (inputDest && inputDest !== suffix) {
      const parts = inputDest.split(row.neighborhood);
      const prefix = parts[0].trim().replace(/,\s*$/, '');
      return prefix ? `${prefix}, ${suffix}` : suffix;
    }
    return suffix;
  }

  /**
   * Reparte los campos de `resolvedData` entre fleet_movements y
   * fleet_route_extensions (paso 4 de `updateRoute`, extraído por
   * complejidad cognitiva). Coincide con el `DynamicFieldValue` privado de
   * routeMovements.repository.ts (union de tipos SQL-parametrizables).
   */
  private static splitUpdateFields(
    resolvedData: RouteUpdateData,
    fuelLevelColumn: string
  ): {
    movementFields: string[];
    movementValues: RouteSqlValue[];
    extensionFields: string[];
    extensionValues: RouteSqlValue[];
  } {
    const movementColumnMap: Record<string, string> = {
      unitId: 'unit_id',
      status: 'status',
      startReading: 'start_reading',
      endReading: 'end_reading',
      fuelLevel: fuelLevelColumn,
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
    const movementValues: RouteSqlValue[] = [];
    const extensionFields: string[] = [];
    const extensionValues: RouteSqlValue[] = [];

    Object.entries(resolvedData).forEach(([key, value]) => {
      const sqlValue = value as RouteSqlValue;
      if (movementColumnMap[key]) {
        movementFields.push(`${movementColumnMap[key]} = ?`);
        movementValues.push(sqlValue);
      } else if (extensionColumnMap[key]) {
        extensionFields.push(`${extensionColumnMap[key]} = ?`);
        if (key === 'additivesCheck') {
          extensionValues.push(sqlValue ? 1 : 0);
        } else {
          extensionValues.push(sqlValue);
        }
      }
    });

    return { movementFields, movementValues, extensionFields, extensionValues };
  }

  /** Pasos 1-3 de `updateRoute`: snapshot before + resolución de destino +
   * validación de telemetría. Extraída para respetar el cap de 50 líneas de
   * Gate 2 (FC166 Track D); mismo comportamiento verbatim, incluyendo el
   * guard de `destination` (solo se sobrescribe cuando está resuelto —
   * evita la key `destination: undefined` espuria descrita abajo). */
  private static async prepareRouteUpdate(
    uuid: string,
    data: RouteUpdateData,
    connection: PoolConnection
  ): Promise<{ snapshotBefore: RowDataPacket; resolvedData: RouteUpdateData }> {
    // 1. Get full snapshot before (joined)
    const snapshotBefore = await RouteMovementsRepository.findRouteSnapshotForUpdate(
      uuid,
      connection
    );
    if (!snapshotBefore) throw new Error('Route not found');

    // 2. Resolve destination if neighborhoodId is being updated
    // Only override `destination` when it's actually meaningful (present
    // in the original payload, or resolved from neighborhoodId) — an
    // unconditional spread would add a `destination: undefined` KEY that
    // Object.entries picks up even when absent from the original `data`,
    // producing an extra (and wrong) SQL field for payloads that never
    // touched destination at all.
    const resolvedDestination = await this.resolveDestination(data, connection);
    const resolvedData: RouteUpdateData =
      resolvedDestination !== undefined ? { ...data, destination: resolvedDestination } : data;

    // 3. Telemetry validation
    const nextStartReading = resolvedData.startReading ?? snapshotBefore.start_reading;
    const nextEndReading = resolvedData.endReading ?? snapshotBefore.end_reading;
    if (nextEndReading !== null && nextEndReading < nextStartReading) {
      throw new Error(
        `Telemetry Disparity: End reading (${nextEndReading} KM) cannot be lower than start reading (${nextStartReading} KM).`
      );
    }

    return { snapshotBefore, resolvedData };
  }

  /** Paso 4 de `updateRoute`: separa campos entre fleet_movements y
   * fleet_route_extensions, y persiste cada mitad. Extraída por el mismo
   * motivo (Gate 2); mismo comportamiento verbatim. */
  private static async persistRouteUpdateFields(
    uuid: string,
    snapshotBefore: RowDataPacket,
    resolvedData: RouteUpdateData,
    connection: PoolConnection
  ): Promise<void> {
    const fuelLevelColumn =
      snapshotBefore.status === 'ACTIVE' ? 'fuel_level_start' : 'fuel_level_end';
    const { movementFields, movementValues, extensionFields, extensionValues } =
      this.splitUpdateFields(resolvedData, fuelLevelColumn);

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
  }

  /**
   * Updates a route entry (split across fleet_movements + fleet_route_extensions) with forensic audit.
   */
  static async updateRoute(
    uuid: string,
    data: RouteUpdateData,
    reason: string,
    adminId: number
  ): Promise<void> {
    if (!uuid) throw new Error('Missing route UUID for update');

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1-3. Snapshot before + resolución de destino + validación de telemetría
      const { snapshotBefore, resolvedData } = await this.prepareRouteUpdate(
        uuid,
        data,
        connection
      );

      // 4. Split fields between fleet_movements and fleet_route_extensions
      await this.persistRouteUpdateFields(uuid, snapshotBefore, resolvedData, connection);

      // 5. Get snapshot after (joined)
      const snapshotAfter = await RouteMovementsRepository.findRouteSnapshotByUuid(
        uuid,
        connection
      );
      if (!snapshotAfter) throw new Error('Route not found after update');

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
      throw new Error(`Forensic Update Failure: ${msg}`, { cause: e });
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

  static async listRoutes(ownerScope: number[] | null): Promise<RowDataPacket[]> {
    return RouteRoutesRepository.listRoutesForOwnerScope(ownerScope);
  }

  static async listUnitActivityLogs(ownerScope: number[] | null): Promise<RowDataPacket[]> {
    return RouteRoutesRepository.listUnitActivityLogsForOwnerScope(ownerScope);
  }

  static async getRouteNode(
    uuid: string
  ): Promise<{ route: RowDataPacket; incidents: RowDataPacket[] } | null> {
    const route = await RouteRoutesRepository.findRouteNodeByUuid(uuid);
    if (!route) return null;
    const incidents = await RouteRoutesRepository.findRouteNodeIncidents(uuid);
    return { route, incidents };
  }

  static async getIncidentNode(uuid: string): Promise<RowDataPacket | null> {
    return RouteRoutesRepository.findIncidentNodeByUuid(uuid);
  }
}

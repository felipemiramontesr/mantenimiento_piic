import { RowDataPacket } from 'mysql2';
import crypto from 'crypto';
import db from './db';
import * as FleetMaintenanceRepository from './fleetMaintenanceWrites.repository';
import { resolveCatalogId, CatalogMappingError } from './catalogMapper';
import NotificationService, {
  ArchonNotificationType,
  ArchonNotificationPriority,
} from './notification.service';
import { MAINTENANCE } from '../constants/maintenance';
import { UNIT_STATUS, MOVEMENT_STATUS } from '../constants/statuses';
import { FleetMaintenanceServiceError } from './fleetMaintenance.errors';
import {
  resolveOwnerScope,
  computeServiceType,
  resolveServiceMode,
  type MaintenanceUser,
  type ServiceType,
} from './fleetMaintenance.service';

/**
 * FC156 F1 — FleetMaintenanceWritesService: the intake (`POST /maintenance`)
 * write endpoint + the shared `applyMaintenanceCompletionToUnit` helper
 * (reused by `fleetMaintenanceLifecycle.service.ts`'s `PATCH .../complete`).
 * Split out of `fleetMaintenance.service.ts` by Gate 1 `max-lines:400`
 * (same domain, `Cond.R-156-M1`) — the 3 lifecycle transitions
 * (complete/accept/reject) live in `fleetMaintenanceLifecycle.service.ts`,
 * split from this file for the same reason. Owns the write transaction
 * directly (`getConnection` + `beginTransaction`/`commit`/`rollback`/
 * `release` in a `try/finally`) per Alfa's `156_AN` architecture directive —
 * the repository only ever executes SQL against the `executor` it's handed
 * (Cond.R-156-M4). Zero SQL, zero Fastify (I1/I2).
 */
export { CatalogMappingError, FleetMaintenanceServiceError };

/**
 * Finalizes a MAINTENANCE movement: updates fleet_units odometer, forecast, and status.
 * Shared by both the direct COMPLETED path (this file) and the PATCH complete path
 * (`fleetMaintenanceLifecycle.service.ts`) — exported for that cross-file reuse.
 */
export async function applyMaintenanceCompletionToUnit(
  connection: FleetMaintenanceRepository.Executor,
  unitId: string,
  odometerAtService: number,
  serviceDate: string,
  maintIntervalKm: number | string,
  details: Array<{ taskCode: string; status: string }>,
  endOdometer?: number,
  fuelLevelEnd?: number
): Promise<void> {
  const unitRow = await FleetMaintenanceRepository.findUnitOdometer(unitId, connection);
  const currentOdometer = Number(unitRow?.odometer || 0);

  // Number() casting prevents string concatenation bug (ASM-021 incident)
  const nextServiceReading =
    Number(odometerAtService) + Number(maintIntervalKm || MAINTENANCE.AGENCY_DEFAULT_INTERVAL_KM);
  // endOdometer reflects post-service km (test drives + return trip); falls back to odometerAtService
  const finalOdometer = Math.max(currentOdometer, Number(endOdometer ?? odometerAtService));

  let updateChassisOdo = false;
  let updateDistributionOdo = false;
  details.forEach((d) => {
    if (d.taskCode === 'CHASSIS_SHOCKS_HEAVY' && (d.status === 'PASS' || d.status === 'REPLACED'))
      updateChassisOdo = true;
    if (
      d.taskCode === 'DISTRIBUTION_KIT_WATER_PUMP' &&
      (d.status === 'PASS' || d.status === 'REPLACED')
    )
      updateDistributionOdo = true;
  });

  const updates: [string, string | number][] = [
    ['odometer', finalOdometer],
    ['lastServiceReading', odometerAtService],
    ['lastServiceDate', serviceDate],
    ['nextServiceReading_forecast', nextServiceReading],
    ['status', UNIT_STATUS.AVAILABLE],
  ];
  if (fuelLevelEnd !== undefined) updates.push(['lastFuelLevel', fuelLevelEnd]);
  if (updateChassisOdo) updates.push(['last_chassis_inspection_odometer', odometerAtService]);
  if (updateDistributionOdo) updates.push(['last_distribution_change_odometer', odometerAtService]);

  await FleetMaintenanceRepository.updateUnitAfterMaintenanceCompletion(
    unitId,
    updates,
    connection
  );
}

// ─── POST /maintenance ──────────────────────────────────────────────────────────

export interface CreateMaintenanceInput {
  unitId: string;
  serviceDate: string;
  odometerAtService: number;
  cost: number;
  technician: string;
  details: Array<{ taskCode: string; status: string; notes?: string | null }>;
  is_in_progress: boolean;
  fuelLevelEnd?: number;
  fuelLitersLoaded?: number;
  fuelAmount?: number;
  endOdometer?: number;
}

export interface CreateMaintenanceResult {
  uuid: string;
  movementStatus: string;
  message: string;
}

function dispatchIntakeOpenNotifications(uuid: string, unitId: string, technician: string): void {
  FleetMaintenanceRepository.findUserByNameOrUsername(technician, db)
    .then((techRow) => {
      if (techRow !== null) {
        const techUserId = techRow.id as number;
        return NotificationService.dispatch({
          userId: techUserId,
          type: ArchonNotificationType.MAINTENANCE_ALERT,
          priority: ArchonNotificationPriority.HIGH,
          title: 'Nueva Orden de Servicio Asignada',
          message: `Se te ha asignado una orden de mantenimiento para la unidad ${unitId}. Acepta o rechaza desde el módulo de Mantenimiento.`,
          metadata: { uuid, unitId, actionRequired: true },
        });
      }
      return Promise.resolve();
    })
    .catch(() => {
      // Notification failure is non-fatal per zero-noise policy
    });

  NotificationService.dispatch({
    permission: 'maint:write',
    type: ArchonNotificationType.MAINTENANCE_ALERT,
    priority: ArchonNotificationPriority.MEDIUM,
    title: 'Nueva orden de mantenimiento creada',
    message: `Nueva orden OPEN creada para unidad #${unitId}. Pendiente de aceptación por técnico.`,
    metadata: { uuid, unitId },
  }).catch(() => {
    // Notification failure is non-fatal per zero-noise policy
  });
}

async function insertMaintenanceMovement(
  data: CreateMaintenanceInput,
  logUuid: string,
  fuelStart: number | null,
  requestingUserId: number,
  connection: FleetMaintenanceRepository.Executor
): Promise<number> {
  if (data.is_in_progress) {
    return FleetMaintenanceRepository.insertOpenMaintenanceMovement(
      {
        uuid: logUuid,
        unitId: data.unitId,
        odometerAtService: data.odometerAtService,
        serviceDate: data.serviceDate,
        fuelStart,
        createdByUserId: requestingUserId,
      },
      connection
    );
  }
  return FleetMaintenanceRepository.insertCompletedMaintenanceMovement(
    {
      uuid: logUuid,
      unitId: data.unitId,
      odometerAtService: data.odometerAtService,
      endOdometer: data.endOdometer ?? data.odometerAtService,
      serviceDate: data.serviceDate,
      fuelStart,
      fuelLevelEnd: data.fuelLevelEnd ?? null,
      fuelLitersLoaded: data.fuelLitersLoaded ?? null,
      fuelAmount: data.fuelAmount ?? null,
    },
    connection
  );
}

async function loadUnitForIntake(
  user: MaintenanceUser,
  unitId: string,
  connection: FleetMaintenanceRepository.Executor
): Promise<RowDataPacket> {
  const unit = await FleetMaintenanceRepository.lockUnitForMaintenance(unitId, connection);
  if (unit === null) throw new Error('Fleet unit not found');
  const ownerScope = await resolveOwnerScope(user);
  if (
    ownerScope !== null &&
    (ownerScope.length === 0 || !ownerScope.includes(unit.ownerId as number))
  ) {
    throw new Error('Fleet unit not found');
  }
  return unit;
}

async function persistMaintenanceExtensionAndDetails(
  movementId: number,
  data: CreateMaintenanceInput,
  serviceType: ServiceType,
  serviceMode: 'IN_SITU' | 'WORKSHOP',
  connection: FleetMaintenanceRepository.Executor
): Promise<void> {
  const serviceTypeId = await resolveCatalogId('MAINT_SERVICE_TYPE', serviceType, connection);
  await FleetMaintenanceRepository.insertMaintenanceExtension(
    {
      movementId,
      serviceDate: data.serviceDate,
      serviceTypeId,
      serviceMode,
      cost: data.cost,
      technician: data.technician,
    },
    connection
  );
  if (data.details.length > 0) {
    await Promise.all(
      data.details.map((detail) =>
        FleetMaintenanceRepository.insertMaintenanceDetail(
          movementId,
          { taskCode: detail.taskCode, status: detail.status, notes: detail.notes ?? null },
          connection
        )
      )
    );
  }
}

async function finalizeIntake(
  connection: FleetMaintenanceRepository.Executor,
  data: CreateMaintenanceInput,
  unit: RowDataPacket,
  logUuid: string
): Promise<CreateMaintenanceResult> {
  if (data.is_in_progress) {
    await connection.commit();
    dispatchIntakeOpenNotifications(logUuid, data.unitId, data.technician);
    return {
      uuid: logUuid,
      movementStatus: MOVEMENT_STATUS.OPEN,
      message: 'Maintenance order created. Awaiting technician acceptance.',
    };
  }
  await applyMaintenanceCompletionToUnit(
    connection,
    data.unitId,
    data.odometerAtService,
    data.serviceDate,
    unit.maintIntervalKm as number | string,
    data.details,
    data.endOdometer,
    data.fuelLevelEnd
  );
  await connection.commit();
  return {
    uuid: logUuid,
    movementStatus: MOVEMENT_STATUS.COMPLETED,
    message: 'Maintenance registered successfully.',
  };
}

/** Orchestrates `POST /maintenance` — hybrid intake (immediate COMPLETED or OPEN awaiting acceptance). */
export async function createMaintenance(
  user: MaintenanceUser,
  requestingUserId: number,
  data: CreateMaintenanceInput
): Promise<CreateMaintenanceResult> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const logUuid = crypto.randomUUID();

    const unit = await loadUnitForIntake(user, data.unitId, connection);
    const serviceType = computeServiceType(
      data.odometerAtService,
      unit.maintIntervalKm as number | string
    );
    const serviceMode = resolveServiceMode(serviceType);
    const fuelStart = unit.lastFuelLevel != null ? Number(unit.lastFuelLevel) : null;

    const movementId = await insertMaintenanceMovement(
      data,
      logUuid,
      fuelStart,
      requestingUserId,
      connection
    );
    await persistMaintenanceExtensionAndDetails(
      movementId,
      data,
      serviceType,
      serviceMode,
      connection
    );

    return await finalizeIntake(connection, data, unit, logUuid);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

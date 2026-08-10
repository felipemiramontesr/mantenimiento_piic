import { RowDataPacket } from 'mysql2';
import db from './db';
import * as FleetMaintenanceRepository from './fleetMaintenanceWrites.repository';
import { isUnitOwned } from './fleetMaintenance.repository';
import { resolveCatalogId } from './catalogMapper';
import NotificationService, {
  ArchonNotificationType,
  ArchonNotificationPriority,
} from './notification.service';
import { createWorkOrder } from './workOrderService';
import { purgeOutboxForOrder } from './notificationsOutboxService';
import { MAINTENANCE } from '../constants/maintenance';
import { UNIT_STATUS, MOVEMENT_STATUS } from '../constants/statuses';
import { FleetMaintenanceServiceError } from './fleetMaintenance.errors';
import {
  resolveOwnerScope,
  computeServiceType,
  resolveServiceMode,
  type MaintenanceUser,
} from './fleetMaintenance.service';
import { applyMaintenanceCompletionToUnit } from './fleetMaintenanceWrites.service';

/**
 * FC156 F1 — FleetMaintenanceLifecycleService: the 3 order-lifecycle
 * transitions (complete/accept/reject an existing order), split out of
 * `fleetMaintenanceWrites.service.ts` by Gate 1 `max-lines:400` (same
 * domain, `Cond.R-156-M1` — intake/POST stays in the writes file, these 3
 * PATCH endpoints move here). Same architecture as the writes service: owns
 * its own transactions (`getConnection` + `beginTransaction`/`commit`/
 * `rollback`/`release` in a `try/finally`), zero SQL, zero Fastify (I1/I2).
 */
export { FleetMaintenanceServiceError };

// ─── PATCH /maintenance/:uuid/complete ──────────────────────────────────────────

export interface CompleteMaintenanceInput {
  odometerAtService: number;
  cost: number;
  serviceDate?: string;
  technician?: string;
  details: Array<{ taskCode: string; status: string; notes?: string | null }>;
  fuelLevelEnd?: number;
  fuelLitersLoaded?: number;
  fuelAmount?: number;
  endOdometer?: number;
}

export interface CompleteMaintenanceResult {
  uuid: string;
  movementStatus: string;
  message: string;
}

function dispatchCompletionNotifications(uuid: string, unitId: string): void {
  purgeOutboxForOrder(uuid).catch(() => {
    // Outbox purge failure is non-fatal per zero-noise policy
  });
  NotificationService.dispatch({
    permission: 'maint:write',
    type: ArchonNotificationType.MAINTENANCE_ALERT,
    priority: ArchonNotificationPriority.HIGH,
    title: 'Unidad lista para operación',
    message: `Orden ${uuid} completada. Unidad #${unitId} liberada a Disponible.`,
    metadata: { uuid, unitId },
  }).catch(() => {
    // Notification failure is non-fatal per zero-noise policy
  });
  NotificationService.dispatch({
    permission: 'fleet:write',
    type: ArchonNotificationType.MAINTENANCE_ALERT,
    priority: ArchonNotificationPriority.HIGH,
    title: 'Unidad lista para operación',
    message: `Orden ${uuid} completada. Unidad #${unitId} liberada a Disponible.`,
    metadata: { uuid, unitId },
  }).catch(() => {
    // Notification failure is non-fatal per zero-noise policy
  });
}

async function loadOrderForCompletion(
  uuid: string,
  user: MaintenanceUser,
  connection: FleetMaintenanceRepository.Executor
): Promise<RowDataPacket> {
  const movement = await FleetMaintenanceRepository.lockMaintenanceOrderByUuid(uuid, connection);
  if (movement === null) throw new Error('Maintenance order not found');
  const ownerScope = await resolveOwnerScope(user);
  if (ownerScope !== null) {
    if (ownerScope.length === 0) throw new Error('Maintenance order not found');
    const owned = await isUnitOwned(movement.unit_id as string, ownerScope, connection);
    if (!owned) throw new Error('Maintenance order not found');
  }
  if (movement.status !== MOVEMENT_STATUS.ACTIVE) {
    throw new Error(`Cannot complete: order is already ${movement.status as string}`);
  }
  return movement;
}

interface CompletionServiceTypeResult {
  finalServiceDate: string;
  maintIntervalKm: number | string;
}

async function recomputeAndPersistServiceType(
  movement: RowDataPacket,
  data: CompleteMaintenanceInput,
  unitId: string,
  connection: FleetMaintenanceRepository.Executor
): Promise<CompletionServiceTypeResult> {
  const maintIntervalKm =
    (await FleetMaintenanceRepository.findUnitMaintInterval(unitId, connection)) ??
    MAINTENANCE.AGENCY_DEFAULT_INTERVAL_KM;
  const finalServiceDate = data.serviceDate ?? (movement.service_date as string);
  const finalServiceType = computeServiceType(data.odometerAtService, maintIntervalKm);
  const finalServiceMode = resolveServiceMode(finalServiceType);
  const finalTechnician = data.technician ?? (movement.technician as string);

  const finalServiceTypeId = await resolveCatalogId(
    'MAINT_SERVICE_TYPE',
    finalServiceType,
    connection
  );
  await FleetMaintenanceRepository.updateMaintenanceExtension(
    {
      movementId: movement.id as number,
      serviceDate: finalServiceDate,
      serviceTypeId: finalServiceTypeId,
      serviceMode: finalServiceMode,
      cost: data.cost,
      technician: finalTechnician,
    },
    connection
  );
  return { finalServiceDate, maintIntervalKm };
}

async function persistCompletionDetails(
  movementId: number,
  details: Array<{ taskCode: string; status: string; notes?: string | null }>,
  connection: FleetMaintenanceRepository.Executor
): Promise<void> {
  if (details.length === 0) return;
  await Promise.all(
    details.map((detail) =>
      FleetMaintenanceRepository.upsertMaintenanceDetail(
        movementId,
        { taskCode: detail.taskCode, status: detail.status, notes: detail.notes ?? null },
        connection
      )
    )
  );
}

async function persistMovementCompletion(
  uuid: string,
  data: CompleteMaintenanceInput,
  connection: FleetMaintenanceRepository.Executor
): Promise<void> {
  await FleetMaintenanceRepository.completeMaintenanceMovement(
    {
      uuid,
      odometerAtService: data.odometerAtService,
      endOdometer: data.endOdometer ?? data.odometerAtService,
      fuelLevelEnd: data.fuelLevelEnd ?? null,
      fuelLitersLoaded: data.fuelLitersLoaded ?? null,
      fuelAmount: data.fuelAmount ?? null,
    },
    connection
  );
}

/** Orchestrates `PATCH /maintenance/:uuid/complete` — closes an ACTIVE order, releases the unit. */
export async function completeMaintenance(
  user: MaintenanceUser,
  uuid: string,
  data: CompleteMaintenanceInput
): Promise<CompleteMaintenanceResult> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const movement = await loadOrderForCompletion(uuid, user, connection);
    const unitId = movement.unit_id as string;
    await persistMovementCompletion(uuid, data, connection);

    const { finalServiceDate, maintIntervalKm } = await recomputeAndPersistServiceType(
      movement,
      data,
      unitId,
      connection
    );
    await persistCompletionDetails(movement.id as number, data.details, connection);

    await applyMaintenanceCompletionToUnit(
      connection,
      unitId,
      data.odometerAtService,
      finalServiceDate,
      maintIntervalKm,
      data.details,
      data.endOdometer,
      data.fuelLevelEnd
    );
    await connection.commit();

    dispatchCompletionNotifications(uuid, unitId);
    return {
      uuid,
      movementStatus: MOVEMENT_STATUS.COMPLETED,
      message: 'Maintenance completed. Unit released to Disponible.',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ─── PATCH /maintenance/:uuid/accept ────────────────────────────────────────────

export interface AcceptMaintenanceResult {
  workOrderId: string | number;
}

async function bridgeMaintenanceDetailsToWorkOrder(
  maintenanceId: number,
  workOrderId: string | number,
  connection: FleetMaintenanceRepository.Executor
): Promise<void> {
  const detailRows = await FleetMaintenanceRepository.findBridgeTaskStatuses(
    maintenanceId,
    connection
  );
  const naTaskIds = detailRows
    .filter((r) => r.status_code === 'N_A')
    .map((r) => r.task_code as string);
  const deferredTaskIds = detailRows
    .filter((r) => r.status_code === 'DEFERRED')
    .map((r) => r.task_code as string);

  await FleetMaintenanceRepository.markWorkOrderTasksStructuralNA(
    workOrderId as number,
    naTaskIds,
    connection
  );
  await FleetMaintenanceRepository.markWorkOrderTasksDeferredFinancial(
    workOrderId as number,
    deferredTaskIds,
    connection
  );
}

function dispatchAcceptNotification(
  movement: RowDataPacket,
  uuid: string,
  unitId: string,
  workOrderId: string | number,
  onNotifyWarn?: (err: unknown) => void
): void {
  const createdByUserId = movement.created_by_user_id as number | null;
  if (!createdByUserId) return;
  NotificationService.dispatch({
    userId: createdByUserId,
    type: ArchonNotificationType.MAINTENANCE_ALERT,
    priority: ArchonNotificationPriority.MEDIUM,
    title: 'Orden Aceptada por el Técnico',
    message: `El técnico ${
      movement.technician as string
    } aceptó la orden para la unidad ${unitId}. Proceso UPA iniciado.`,
    metadata: { uuid, unitId, workOrderId },
  }).catch((err: unknown) => {
    onNotifyWarn?.(err);
  });
}

/** Orchestrates `PATCH /maintenance/:uuid/accept` — OPEN→ACTIVE, locks unit, creates UPA work order. */
export async function acceptMaintenance(
  uuid: string,
  onNotifyWarn?: (err: unknown) => void
): Promise<AcceptMaintenanceResult> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const movement = await FleetMaintenanceRepository.lockOpenMaintenanceOrderByUuid(
      uuid,
      connection
    );
    if (movement === null) {
      throw new FleetMaintenanceServiceError('NOT_FOUND', 'Orden no encontrada');
    }
    if (movement.status !== MOVEMENT_STATUS.OPEN) {
      throw new FleetMaintenanceServiceError(
        'CONFLICT',
        `La orden ya está en estado ${movement.status as string}`
      );
    }

    const unitId = movement.unit_id as string;
    await FleetMaintenanceRepository.activateMaintenanceMovement(uuid, connection);
    await FleetMaintenanceRepository.updateUnitStatus(unitId, UNIT_STATUS.MAINTENANCE, connection);

    const workOrderResult = await createWorkOrder(unitId);
    await FleetMaintenanceRepository.linkWorkOrderToMovement(
      uuid,
      workOrderResult.workOrderId,
      connection
    );
    await bridgeMaintenanceDetailsToWorkOrder(
      movement.id as number,
      workOrderResult.workOrderId,
      connection
    );

    await connection.commit();
    dispatchAcceptNotification(movement, uuid, unitId, workOrderResult.workOrderId, onNotifyWarn);
    return { workOrderId: workOrderResult.workOrderId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ─── PATCH /maintenance/:uuid/reject ─────────────────────────────────────────────

function dispatchRejectNotification(
  movement: RowDataPacket,
  uuid: string,
  unitId: string,
  rejectedByTech: string,
  onNotifyWarn?: (err: unknown) => void
): void {
  const createdByUserId = movement.created_by_user_id as number | null;
  if (!createdByUserId) return;
  NotificationService.dispatch({
    userId: createdByUserId,
    type: ArchonNotificationType.MAINTENANCE_ALERT,
    priority: ArchonNotificationPriority.HIGH,
    title: 'Orden Rechazada — Reasignación Requerida',
    message: `El técnico ${rejectedByTech} rechazó la orden para la unidad ${unitId}. Por favor reasigna un técnico disponible.`,
    metadata: { uuid, unitId },
  }).catch((err: unknown) => {
    onNotifyWarn?.(err);
  });
}

/** Orchestrates `PATCH /maintenance/:uuid/reject` — clears technician, order stays OPEN. */
export async function rejectMaintenance(
  uuid: string,
  onNotifyWarn?: (err: unknown) => void
): Promise<void> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const movement = await FleetMaintenanceRepository.lockOpenMaintenanceOrderForReject(
      uuid,
      connection
    );
    if (movement === null) {
      throw new FleetMaintenanceServiceError('NOT_FOUND', 'Orden no encontrada');
    }
    if (movement.status !== MOVEMENT_STATUS.OPEN) {
      throw new FleetMaintenanceServiceError(
        'CONFLICT',
        `No se puede rechazar: la orden está en estado ${movement.status as string}`
      );
    }

    const rejectedByTech = movement.technician as string;
    const unitId = movement.unit_id as string;
    await FleetMaintenanceRepository.clearMaintenanceTechnician(movement.id as number, connection);
    await connection.commit();

    purgeOutboxForOrder(uuid).catch(() => {
      // Outbox purge failure is non-fatal per zero-noise policy
    });
    dispatchRejectNotification(movement, uuid, unitId, rejectedByTech, onNotifyWarn);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

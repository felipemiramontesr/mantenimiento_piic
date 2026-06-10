import { RowDataPacket } from 'mysql2';
import db from './db';
import NotificationService, {
  ArchonNotificationType,
  ArchonNotificationPriority,
} from './notification.service';

const OPEN_TOO_LONG_HOURS = 2;
const ACTIVE_TOO_LONG_HOURS = 48;

const TYPE_OPEN = 'MAINTENANCE_OPEN_TOO_LONG';
const TYPE_ACTIVE = 'MAINTENANCE_ACTIVE_TOO_LONG';
const TYPE_INSURANCE_30D = 'INSURANCE_EXPIRY_30D';
const TYPE_INSURANCE_15D = 'INSURANCE_EXPIRY_15D';
const TYPE_INSURANCE_3D = 'INSURANCE_EXPIRY_3D';
const TYPE_VERIFICACION_15D = 'VERIFICACION_EXPIRY_15D';
const TYPE_LEGAL_15D = 'LEGAL_COMPLIANCE_15D';
const TYPE_SCHEDULED_OVERDUE = 'SCHEDULED_ORDER_OVERDUE';

interface OrderRow extends RowDataPacket {
  uuid: string;
}

interface FleetUnitRow extends RowDataPacket {
  uuid: string;
  unitId: string;
  daysLeft: number;
}

interface OutboxRow extends RowDataPacket {
  id: number;
}

async function isAlreadySent(
  permissionSlug: string,
  type: string,
  sourceUuid: string
): Promise<boolean> {
  const [rows] = await db.execute<OutboxRow[]>(
    `SELECT id FROM notifications_outbox
     WHERE permission_slug = ? AND notification_type = ? AND source_uuid = ?
     LIMIT 1`,
    [permissionSlug, type, sourceUuid]
  );
  return rows.length > 0;
}

async function recordOutbox(
  permissionSlug: string,
  type: string,
  sourceUuid: string
): Promise<void> {
  await db.execute(
    `INSERT IGNORE INTO notifications_outbox (permission_slug, notification_type, source_uuid)
     VALUES (?, ?, ?)`,
    [permissionSlug, type, sourceUuid]
  );
}

export async function purgeOutboxForOrder(orderUuid: string): Promise<void> {
  await db.execute(`DELETE FROM notifications_outbox WHERE source_uuid = ?`, [orderUuid]);
}

export async function purgeOutboxByType(
  sourceUuid: string,
  notificationType: string
): Promise<void> {
  await db.execute(
    `DELETE FROM notifications_outbox WHERE source_uuid = ? AND notification_type = ?`,
    [sourceUuid, notificationType]
  );
}

async function alertOpenOrder(uuid: string): Promise<void> {
  if (await isAlreadySent('maint:write', TYPE_OPEN, uuid)) return;
  await recordOutbox('maint:write', TYPE_OPEN, uuid);
  NotificationService.dispatch({
    permission: 'maint:write',
    type: ArchonNotificationType.MAINTENANCE_ALERT,
    priority: ArchonNotificationPriority.MEDIUM,
    title: 'Orden sin técnico asignado',
    message: `Orden ${uuid} lleva más de ${OPEN_TOO_LONG_HOURS}h sin técnico que la acepte.`,
    metadata: { uuid },
  }).catch(() => {
    // Notification failure is non-fatal per zero-noise policy
  });
}

async function alertActiveOrder(uuid: string): Promise<void> {
  if (await isAlreadySent('fleet:write', TYPE_ACTIVE, uuid)) return;
  await recordOutbox('fleet:write', TYPE_ACTIVE, uuid);
  NotificationService.dispatch({
    permission: 'fleet:write',
    type: ArchonNotificationType.MAINTENANCE_ALERT,
    priority: ArchonNotificationPriority.HIGH,
    title: 'Unidad en taller prolongado',
    message: `Orden ${uuid} lleva más de ${ACTIVE_TOO_LONG_HOURS}h activa en taller.`,
    metadata: { uuid },
  }).catch(() => {
    // Notification failure is non-fatal per zero-noise policy
  });
}

async function alertFleetUnit(
  unitUuid: string,
  unitId: string,
  outboxType: string,
  priority: ArchonNotificationPriority,
  title: string,
  message: string
): Promise<void> {
  if (await isAlreadySent('fleet:write', outboxType, unitUuid)) return;
  await recordOutbox('fleet:write', outboxType, unitUuid);
  NotificationService.dispatch({
    permission: 'fleet:write',
    type: ArchonNotificationType.SYSTEM,
    priority,
    title,
    message,
    metadata: { unitUuid, unitId },
  }).catch(() => {
    // Notification failure is non-fatal per zero-noise policy
  });
}

async function alertScheduledOrderOverdue(orderUuid: string): Promise<void> {
  if (await isAlreadySent('maint:write', TYPE_SCHEDULED_OVERDUE, orderUuid)) return;
  await recordOutbox('maint:write', TYPE_SCHEDULED_OVERDUE, orderUuid);
  NotificationService.dispatch({
    permission: 'maint:write',
    type: ArchonNotificationType.MAINTENANCE_ALERT,
    priority: ArchonNotificationPriority.MEDIUM,
    title: 'Orden programada vencida',
    message: `Orden ${orderUuid}: fecha de servicio programada ya venció y sigue sin iniciarse.`,
    metadata: { uuid: orderUuid },
  }).catch(() => {
    // Notification failure is non-fatal per zero-noise policy
  });
}

export async function processPendingAlerts(): Promise<void> {
  // ── Maintenance workflow ──────────────────────────────────────────────────
  const [openRows] = await db.execute<OrderRow[]>(
    `SELECT uuid FROM fleet_movements
     WHERE status = 'OPEN'
       AND TIMESTAMPDIFF(HOUR, created_at, NOW()) >= ?`,
    [OPEN_TOO_LONG_HOURS]
  );
  await Promise.all(openRows.map((row) => alertOpenOrder(row.uuid)));

  const [activeRows] = await db.execute<OrderRow[]>(
    `SELECT uuid FROM fleet_movements
     WHERE status = 'ACTIVE'
       AND TIMESTAMPDIFF(HOUR, created_at, NOW()) >= ?`,
    [ACTIVE_TOO_LONG_HOURS]
  );
  await Promise.all(activeRows.map((row) => alertActiveOrder(row.uuid)));

  // ── Scheduled order overdue (OPEN + service_date past) ───────────────────
  const [overdueRows] = await db.execute<OrderRow[]>(
    `SELECT fm.uuid
     FROM fleet_movements fm
     JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
     WHERE fm.status = 'OPEN'
       AND fme.service_date IS NOT NULL
       AND fme.service_date < CURDATE()`
  );
  await Promise.all(overdueRows.map((row) => alertScheduledOrderOverdue(row.uuid)));

  // ── Fleet unit compliance — insurance ────────────────────────────────────
  const [ins30Rows] = await db.execute<FleetUnitRow[]>(
    `SELECT uuid, id AS unitId, DATEDIFF(insuranceExpiryDate, CURDATE()) AS daysLeft
     FROM fleet_units
     WHERE insuranceExpiryDate IS NOT NULL
       AND DATEDIFF(insuranceExpiryDate, CURDATE()) BETWEEN 0 AND 30`
  );
  await Promise.all(
    ins30Rows.map((row) =>
      alertFleetUnit(
        row.uuid,
        row.unitId,
        TYPE_INSURANCE_30D,
        ArchonNotificationPriority.LOW,
        'Seguro próximo a vencer',
        `Unidad ${row.unitId}: seguro vence en ${row.daysLeft} días. Renovar a la brevedad.`
      )
    )
  );

  const [ins15Rows] = await db.execute<FleetUnitRow[]>(
    `SELECT uuid, id AS unitId, DATEDIFF(insuranceExpiryDate, CURDATE()) AS daysLeft
     FROM fleet_units
     WHERE insuranceExpiryDate IS NOT NULL
       AND DATEDIFF(insuranceExpiryDate, CURDATE()) BETWEEN 0 AND 15`
  );
  await Promise.all(
    ins15Rows.map((row) =>
      alertFleetUnit(
        row.uuid,
        row.unitId,
        TYPE_INSURANCE_15D,
        ArchonNotificationPriority.MEDIUM,
        'Seguro vence pronto',
        `Unidad ${row.unitId}: seguro vence en ${row.daysLeft} días. Renovación urgente.`
      )
    )
  );

  const [ins3Rows] = await db.execute<FleetUnitRow[]>(
    `SELECT uuid, id AS unitId, DATEDIFF(insuranceExpiryDate, CURDATE()) AS daysLeft
     FROM fleet_units
     WHERE insuranceExpiryDate IS NOT NULL
       AND DATEDIFF(insuranceExpiryDate, CURDATE()) BETWEEN 0 AND 3`
  );
  await Promise.all(
    ins3Rows.map((row) =>
      alertFleetUnit(
        row.uuid,
        row.unitId,
        TYPE_INSURANCE_3D,
        ArchonNotificationPriority.HIGH,
        'Seguro vence en días',
        `Unidad ${row.unitId}: seguro vence en ${row.daysLeft} días. Atención inmediata requerida.`
      )
    )
  );

  // ── Fleet unit compliance — verificación ─────────────────────────────────
  const [verRows] = await db.execute<FleetUnitRow[]>(
    `SELECT uuid, id AS unitId, DATEDIFF(vencimientoVerificacion, CURDATE()) AS daysLeft
     FROM fleet_units
     WHERE vencimientoVerificacion IS NOT NULL
       AND DATEDIFF(vencimientoVerificacion, CURDATE()) BETWEEN 0 AND 15`
  );
  await Promise.all(
    verRows.map((row) =>
      alertFleetUnit(
        row.uuid,
        row.unitId,
        TYPE_VERIFICACION_15D,
        ArchonNotificationPriority.MEDIUM,
        'Verificación próxima a vencer',
        `Unidad ${row.unitId}: verificación vence en ${row.daysLeft} días.`
      )
    )
  );

  // ── Fleet unit compliance — cumplimiento legal ───────────────────────────
  const [legalRows] = await db.execute<FleetUnitRow[]>(
    `SELECT uuid, id AS unitId, DATEDIFF(legalComplianceDate, CURDATE()) AS daysLeft
     FROM fleet_units
     WHERE legalComplianceDate IS NOT NULL
       AND DATEDIFF(legalComplianceDate, CURDATE()) BETWEEN 0 AND 15`
  );
  await Promise.all(
    legalRows.map((row) =>
      alertFleetUnit(
        row.uuid,
        row.unitId,
        TYPE_LEGAL_15D,
        ArchonNotificationPriority.MEDIUM,
        'Cumplimiento legal próximo a vencer',
        `Unidad ${row.unitId}: cumplimiento legal vence en ${row.daysLeft} días.`
      )
    )
  );
}

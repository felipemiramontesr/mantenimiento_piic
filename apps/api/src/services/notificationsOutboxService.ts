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

interface OrderRow extends RowDataPacket {
  uuid: string;
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

export async function processPendingAlerts(): Promise<void> {
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
}

import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC209 F2 — SQL de `arcsial_invitations` (migración 185). Se guarda `token_hash` (SHA-256), jamás el
 * token. La caducidad es pasiva (R 538_AN): se evalúa con `expires_at < NOW()` al listar y al
 * responder; no hay cron.
 */
type Executor = Pool | PoolConnection;

export type InviteType = 'CONTACT' | 'UNIVERSE';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED' | 'EXPIRED';

export interface NewInvitation {
  readonly senderId: number;
  readonly recipientId: number;
  readonly inviteType: InviteType;
  readonly tenantId: number | null;
  readonly tokenHash: string;
}

export interface LockedInvitation {
  readonly id: number;
  readonly senderId: number;
  readonly recipientId: number;
  readonly inviteType: InviteType;
  readonly tenantId: number | null;
  readonly status: InviteStatus;
  readonly expired: boolean;
}

/** El Universo cuyo MU (`tenants.mu_user_id`) es el usuario, o null. */
export async function findMuTenantId(
  userId: number,
  executor: Executor = db
): Promise<number | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT id FROM tenants WHERE mu_user_id = ? ORDER BY id LIMIT 1',
    [userId]
  );
  return rows.length > 0 ? (rows[0].id as number) : null;
}

/** Invitaciones emitidas en la última hora y en el último día (bloquea esas filas en la TX). */
export async function countSentRecently(
  senderId: number,
  executor: Executor
): Promise<{ lastHour: number; lastDay: number }> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT SUM(created_at > NOW() - INTERVAL 1 HOUR) AS lastHour, COUNT(*) AS lastDay
     FROM arcsial_invitations WHERE sender_id = ? AND created_at > NOW() - INTERVAL 1 DAY FOR UPDATE`,
    [senderId]
  );
  return { lastHour: Number(rows[0]?.lastHour ?? 0), lastDay: Number(rows[0]?.lastDay ?? 0) };
}

/** Invitaciones PENDING vigentes del emisor hacia el mismo destinatario. */
export async function countPendingToPair(
  senderId: number,
  recipientId: number,
  executor: Executor
): Promise<number> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS pending FROM arcsial_invitations
     WHERE sender_id = ? AND recipient_id = ? AND status = 'PENDING' AND expires_at >= NOW() FOR UPDATE`,
    [senderId, recipientId]
  );
  return Number(rows[0]?.pending ?? 0);
}

/** Inserta la invitación con TTL de 7 días; devuelve id y caducidad según el reloj de la base. */
export async function insertInvitation(
  invitation: NewInvitation,
  executor: Executor
): Promise<{ id: number; expiresAt: string }> {
  const [result] = await executor.execute<ResultSetHeader>(
    `INSERT INTO arcsial_invitations (sender_id, recipient_id, invite_type, tenant_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?, ?, NOW() + INTERVAL 7 DAY)`,
    [
      invitation.senderId,
      invitation.recipientId,
      invitation.inviteType,
      invitation.tenantId,
      invitation.tokenHash,
    ]
  );
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT expires_at AS expiresAt FROM arcsial_invitations WHERE id = ?',
    [result.insertId]
  );
  return { id: result.insertId, expiresAt: String(rows[0].expiresAt) };
}

/** La invitación con su fila bloqueada (`FOR UPDATE`) y si ya venció, o null. */
export async function lockInvitation(
  id: number,
  executor: Executor
): Promise<LockedInvitation | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT id, sender_id AS senderId, recipient_id AS recipientId, invite_type AS inviteType,
            tenant_id AS tenantId, status, (expires_at < NOW()) AS expired
     FROM arcsial_invitations WHERE id = ? FOR UPDATE`,
    [id]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return { ...(row as LockedInvitation), expired: Boolean(row.expired) };
}

/** Cambia el estado; las respuestas de una persona fijan `responded_at`, la caducidad no. */
export async function setInvitationStatus(
  id: number,
  status: Exclude<InviteStatus, 'PENDING'>,
  executor: Executor
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `UPDATE arcsial_invitations
     SET status = ?, responded_at = IF(? = 'EXPIRED', responded_at, NOW()) WHERE id = ?`,
    [status, status, id]
  );
}

/** Cancela las PENDING entre ambos usuarios, en los dos sentidos (bloqueo). */
export async function cancelPendingBetween(
  a: number,
  b: number,
  executor: Executor
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `UPDATE arcsial_invitations SET status = 'CANCELED', responded_at = NOW()
     WHERE status = 'PENDING'
       AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))`,
    [a, b, b, a]
  );
}

/** Caducidad pasiva: las PENDING vencidas del usuario (como emisor o destinatario) pasan a EXPIRED. */
export async function expirePendingFor(userId: number, executor: Executor = db): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `UPDATE arcsial_invitations SET status = 'EXPIRED'
     WHERE status = 'PENDING' AND expires_at < NOW() AND (sender_id = ? OR recipient_id = ?)`,
    [userId, userId]
  );
}

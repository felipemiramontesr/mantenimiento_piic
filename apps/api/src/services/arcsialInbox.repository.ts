import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import db from './db';
import type { InviteStatus, InviteType } from './arcsialInvitations.repository';

/**
 * FC209 F2 — lecturas de la bandeja y del destinatario: las invitaciones del usuario (recibidas y
 * enviadas) con el perfil público de la otra parte, y el estado del destinatario bloqueado
 * (`FOR UPDATE`) para repetir las puertas de T2 dentro de la TX de aceptación (R 538_AN).
 */
type Executor = Pool | PoolConnection;

export interface InboxEntry {
  readonly id: number;
  readonly direction: 'RECEIVED' | 'SENT';
  readonly inviteType: InviteType;
  readonly status: InviteStatus;
  readonly tenantId: number | null;
  readonly tenantName: string | null;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly respondedAt: string | null;
  readonly counterpartHandle: string | null;
  readonly counterpartDisplayName: string | null;
  readonly counterpartAvatarUrl: string | null;
}

export interface LockedRecipient {
  readonly isActive: boolean;
  readonly roleId: number;
  readonly hasMembership: boolean;
  readonly hasBillingProfile: boolean;
}

/** Recibidas y enviadas, más recientes primero; nunca expone `token_hash`. */
export async function listInbox(userId: number, executor: Executor = db): Promise<InboxEntry[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT i.id, IF(i.recipient_id = ?, 'RECEIVED', 'SENT') AS direction,
            i.invite_type AS inviteType, i.status, i.tenant_id AS tenantId, t.label AS tenantName,
            i.created_at AS createdAt, i.expires_at AS expiresAt, i.responded_at AS respondedAt,
            p.handle AS counterpartHandle, p.display_name AS counterpartDisplayName,
            p.avatar_url AS counterpartAvatarUrl
     FROM arcsial_invitations i
     LEFT JOIN tenants t ON t.id = i.tenant_id
     LEFT JOIN arcsial_profiles p ON p.user_id = IF(i.recipient_id = ?, i.sender_id, i.recipient_id)
     WHERE i.recipient_id = ? OR i.sender_id = ?
     ORDER BY i.created_at DESC, i.id DESC`,
    [userId, userId, userId, userId]
  );
  return rows as InboxEntry[];
}

/** Estado del destinatario con sus filas bloqueadas (usuario, membresías y perfil fiscal), o null. */
export async function lockRecipient(
  userId: number,
  executor: Executor
): Promise<LockedRecipient | null> {
  const [users] = await executor.execute<RowDataPacket[]>(
    'SELECT is_active, role_id FROM users WHERE id = ? FOR UPDATE',
    [userId]
  );
  if (users.length === 0) return null;
  const [memberships] = await executor.execute<RowDataPacket[]>(
    'SELECT 1 FROM tenant_user_memberships WHERE user_id = ? FOR UPDATE',
    [userId]
  );
  const [billing] = await executor.execute<RowDataPacket[]>(
    'SELECT 1 FROM user_billing_profiles WHERE user_id = ? FOR UPDATE',
    [userId]
  );
  return {
    isActive: Boolean(users[0].is_active),
    roleId: Number(users[0].role_id),
    hasMembership: memberships.length > 0,
    hasBillingProfile: billing.length > 0,
  };
}

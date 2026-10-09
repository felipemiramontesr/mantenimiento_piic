import { PoolConnection } from 'mysql2/promise';
import db from './db';
import * as InvitationsRepository from './arcsialInvitations.repository';
import * as RelationsRepository from './arcsialRelations.repository';
import { lockRecipient } from './arcsialInbox.repository';
import { findArcCosmonautRoleId, insertCosmonautRoleAssignment } from './cosmology.repository';
import { insertTypedMembership } from './universeMembership.repository';
import {
  ALREADY_MEMBER_REJECTION,
  MISSING_BILLING_REJECTION,
  rejectUserRow,
} from './universeUserLinking';
import { recordAuditLog } from './auditService';
import { USER_NOT_FOUND } from './arcsialProfiles.service';
import type { ArcsialError } from './arcsialProfiles.service';
import type { LockedInvitation } from './arcsialInvitations.repository';

/**
 * FC209 F2 (T2) — respuestas a una invitación sobre su fila bloqueada (`FOR UPDATE`), en el orden de la
 * tabla: S (actor correcto, 403) → P (PENDING, 409) → V (vigente; si no, pasa a EXPIRED y 410) →
 * ¬B (sin bloqueo; si no, pasa a CANCELED y 403) → UNIVERSE: ¬Ω, A, I, F repetidas con las filas del
 * destinatario bloqueadas → contacto + (membresía ARC + rol con el tenant_id guardado) + ACCEPTED.
 * Una puerta de UNIVERSE fallida revierte: cero membresía, cero contacto (R 538_AN).
 */

type Action = 'ACCEPT' | 'REJECT' | 'CANCEL';

/** Resultado de una TX: `persist` decide COMMIT (también para EXPIRED/CANCELED) o ROLLBACK. */
interface Outcome<T> {
  readonly result: T | ArcsialError;
  readonly persist: boolean;
}

/** Construye un rechazo. */
function fail(status: number, code: string, message: string): ArcsialError {
  return { ok: false, status, code, message };
}

/** Ejecuta `work` en una TX y confirma o revierte según su `persist`. */
async function inTransaction<T>(
  work: (connection: PoolConnection) => Promise<Outcome<T>>
): Promise<T | ArcsialError> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const outcome = await work(connection);
    await (outcome.persist ? connection.commit() : connection.rollback());
    return outcome.result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** S: aceptar y rechazar son del destinatario; cancelar, del emisor. */
function actorRejection(
  invitation: LockedInvitation,
  callerId: number,
  action: Action
): ArcsialError | null {
  if (action === 'CANCEL') {
    return invitation.senderId === callerId
      ? null
      : fail(403, 'FORBIDDEN_INVITATION_SENDER', 'Solo quien envió la invitación puede cancelarla');
  }
  return invitation.recipientId === callerId
    ? null
    : fail(403, 'FORBIDDEN_INVITATION_RECIPIENT', 'Esta invitación no es para ti');
}

/** Filas 10, 9 y 8 de T2 (y el 404 previo); una invitación vencida queda EXPIRED. */
async function openPending(
  connection: PoolConnection,
  invitationId: number,
  request: { callerId: number; action: Action }
): Promise<LockedInvitation | Outcome<never>> {
  const invitation = await InvitationsRepository.lockInvitation(invitationId, connection);
  if (!invitation) {
    return { result: fail(404, 'INVITATION_NOT_FOUND', 'La invitación no existe'), persist: false };
  }
  const actor = actorRejection(invitation, request.callerId, request.action);
  if (actor) return { result: actor, persist: false };
  if (invitation.status !== 'PENDING') {
    return {
      result: fail(409, 'INVITATION_NOT_PENDING', 'La invitación ya fue respondida'),
      persist: false,
    };
  }
  if (!invitation.expired) return invitation;
  await InvitationsRepository.setInvitationStatus(invitation.id, 'EXPIRED', connection);
  return { result: fail(410, 'INVITATION_EXPIRED', 'La invitación venció'), persist: true };
}

/** Filas 3–6 de T2 con las filas del destinatario bloqueadas. */
async function universeRejection(
  invitation: LockedInvitation,
  connection: PoolConnection
): Promise<ArcsialError | null> {
  const recipient = await lockRecipient(invitation.recipientId, connection);
  const rowRejection = rejectUserRow(recipient);
  if (rowRejection || !recipient) return rowRejection;
  if (recipient.hasMembership) return ALREADY_MEMBER_REJECTION;
  return recipient.hasBillingProfile ? null : MISSING_BILLING_REJECTION;
}

/** Incorpora al destinatario como ARC del Universo guardado en la invitación (R 538_AN). */
async function joinUniverse(
  invitation: LockedInvitation,
  connection: PoolConnection
): Promise<void> {
  const roleId = await findArcCosmonautRoleId(connection);
  if (roleId === null) throw new Error('FC209: rol Arc no configurado (migración 170 pendiente)');
  const tenantId = invitation.tenantId as number;
  await insertTypedMembership(invitation.recipientId, tenantId, 'ARC', connection);
  await insertCosmonautRoleAssignment(
    invitation.recipientId,
    roleId,
    tenantId,
    invitation.senderId,
    connection
  );
}

/** El tramo de aceptación tras abrir la invitación: bloqueo, puertas de UNIVERSE y altas. */
async function acceptOpen(
  invitation: LockedInvitation,
  connection: PoolConnection
): Promise<Outcome<LockedInvitation>> {
  const { senderId, recipientId } = invitation;
  if (await RelationsRepository.isBlockedEitherWay(senderId, recipientId, connection)) {
    await InvitationsRepository.setInvitationStatus(invitation.id, 'CANCELED', connection);
    return {
      result: fail(403, 'BLOCKED_USER', 'No es posible aceptar esta invitación'),
      persist: true,
    };
  }
  if (invitation.inviteType === 'UNIVERSE') {
    const rejection = await universeRejection(invitation, connection);
    if (rejection) return { result: rejection, persist: false };
    await joinUniverse(invitation, connection);
  }
  await RelationsRepository.insertContact(senderId, recipientId, connection);
  await InvitationsRepository.setInvitationStatus(invitation.id, 'ACCEPTED', connection);
  return { result: invitation, persist: true };
}

/** POST /v1/social/invitations/:id/accept. */
export async function acceptInvitation(
  callerId: number,
  invitationId: number
): Promise<{ ok: true; status: 'ACCEPTED'; tenantId: number | null } | ArcsialError> {
  const accepted = await inTransaction<LockedInvitation>(async (connection) => {
    const opened = await openPending(connection, invitationId, { callerId, action: 'ACCEPT' });
    return 'result' in opened ? opened : acceptOpen(opened, connection);
  });
  if ('ok' in accepted) return accepted;
  if (accepted.inviteType === 'UNIVERSE') {
    // `administrative_audit_logs.action` es ENUM(CREATE, UPDATE, DELETE): el evento va en reason.
    await recordAuditLog({
      entity_type: 'user',
      entity_id: String(callerId),
      action: 'CREATE',
      snapshot_after: {
        event: 'ACCEPT_UNIVERSE_INVITATION',
        tenantId: accepted.tenantId,
        role: 'ARC',
      },
      reason: `ACCEPT_UNIVERSE_INVITATION — acepta la invitación ${accepted.id} al Universo ${accepted.tenantId} (FC209 F2)`,
      user_id: callerId,
      owner_id: accepted.tenantId as number,
    });
  }
  return { ok: true, status: 'ACCEPTED', tenantId: accepted.tenantId };
}

/** POST /v1/social/invitations/:id/reject (destinatario) y /cancel (emisor). */
export async function closeInvitation(
  callerId: number,
  invitationId: number,
  action: 'REJECT' | 'CANCEL'
): Promise<{ ok: true; status: 'REJECTED' | 'CANCELED' } | ArcsialError> {
  const status = action === 'REJECT' ? 'REJECTED' : 'CANCELED';
  return inTransaction(async (connection) => {
    const opened = await openPending(connection, invitationId, { callerId, action });
    if ('result' in opened) return opened;
    await InvitationsRepository.setInvitationStatus(opened.id, status, connection);
    return { result: { ok: true, status } as const, persist: true };
  });
}

/** POST /v1/social/blocks/:userId — bloquea, cancela las PENDING en ambos sentidos y retira el contacto. */
export async function blockUser(
  blockerId: number,
  blockedId: number
): Promise<{ ok: true } | ArcsialError> {
  if (blockerId === blockedId)
    return fail(400, 'CANNOT_BLOCK_SELF', 'No puedes bloquearte a ti mismo');
  if (!(await RelationsRepository.userExists(blockedId))) return USER_NOT_FOUND;
  return inTransaction(async (connection) => {
    await RelationsRepository.insertBlock(blockerId, blockedId, connection);
    await InvitationsRepository.cancelPendingBetween(blockerId, blockedId, connection);
    await RelationsRepository.deleteContact(blockerId, blockedId, connection);
    return { result: { ok: true } as const, persist: true };
  });
}

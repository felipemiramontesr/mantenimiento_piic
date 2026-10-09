import { createHash, randomBytes } from 'node:crypto';
import { PoolConnection } from 'mysql2/promise';
import db from './db';
import { findProfileByHandle } from './arcsialProfiles.repository';
import { areContacts, isBlockedEitherWay } from './arcsialRelations.repository';
import * as InvitationsRepository from './arcsialInvitations.repository';
import { listInbox } from './arcsialInbox.repository';
import { validateLinkCandidate } from './universeUserLinking';
import { USER_NOT_FOUND } from './arcsialProfiles.service';
import type { ArcsialError } from './arcsialProfiles.service';
import type { InboxEntry } from './arcsialInbox.repository';
import type { InviteType } from './arcsialInvitations.repository';

/**
 * FC209 F2 (T1) — emisión de invitaciones en el orden estricto de la tabla: H (handle exacto sin
 * bloqueo, 404 opaco antes que nada) → D (no a uno mismo) → CONTACT: K (no ser ya contactos) /
 * UNIVERSE: M (emisor MU), luego ¬Ω, A, I, F (las puertas de FC207, reutilizadas) → Q (≤10/h, ≤50/d)
 * → C (≤3 pendientes al par). Q y C se cuentan dentro de la TX del INSERT. Se guarda el SHA-256 del
 * token; el token en claro solo vuelve al emisor.
 */

export const HOURLY_QUOTA = 10;
export const DAILY_QUOTA = 50;
export const MAX_PENDING_PER_PAIR = 3;

/** Construye un rechazo. */
function fail(status: number, code: string, message: string): ArcsialError {
  return { ok: false, status, code, message };
}

export interface IssuedInvitation {
  readonly ok: true;
  readonly id: number;
  readonly inviteType: InviteType;
  readonly expiresAt: string;
  readonly inviteToken: string;
}

interface Issue {
  readonly senderId: number;
  readonly recipientId: number;
  readonly inviteType: InviteType;
  readonly tenantId: number | null;
}

/** T1 fila 9 y 4b–4e: el emisor debe ser MU de un Universo; el destinatario pasa las puertas. */
async function universeGates(issue: Omit<Issue, 'tenantId'>): Promise<number | ArcsialError> {
  const tenantId = await InvitationsRepository.findMuTenantId(issue.senderId);
  if (tenantId === null) {
    return fail(
      403,
      'SENDER_NOT_MASTER_OF_UNIVERSE',
      'Solo el Master of Universe invita a su Universo'
    );
  }
  const candidate = await validateLinkCandidate(issue.recipientId);
  return 'rfc' in candidate ? tenantId : candidate;
}

/** Filas 4 (Q, 429) y 3 (C, 409) de T1, contadas con las filas bloqueadas de la TX. */
async function quotaRejection(
  issue: Issue,
  connection: PoolConnection
): Promise<ArcsialError | null> {
  const sent = await InvitationsRepository.countSentRecently(issue.senderId, connection);
  if (sent.lastHour >= HOURLY_QUOTA || sent.lastDay >= DAILY_QUOTA) {
    return fail(429, 'INVITATION_RATE_LIMIT_EXCEEDED', 'Alcanzaste el límite de invitaciones');
  }
  const pending = await InvitationsRepository.countPendingToPair(
    issue.senderId,
    issue.recipientId,
    connection
  );
  return pending >= MAX_PENDING_PER_PAIR
    ? fail(409, 'MAX_PENDING_INVITATIONS_EXCEEDED', 'Ya hay invitaciones pendientes a esta persona')
    : null;
}

/** Cuotas y el INSERT, en una sola TX. */
async function insertWithinQuotas(issue: Issue): Promise<IssuedInvitation | ArcsialError> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const rejection = await quotaRejection(issue, connection);
    if (rejection) {
      await connection.rollback();
      return rejection;
    }
    const inviteToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(inviteToken).digest('hex');
    const saved = await InvitationsRepository.insertInvitation({ ...issue, tokenHash }, connection);
    await connection.commit();
    return {
      ok: true,
      id: saved.id,
      inviteType: issue.inviteType,
      expiresAt: saved.expiresAt,
      inviteToken,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** POST /v1/social/invitations. */
export async function issueInvitation(
  senderId: number,
  recipientHandle: string,
  inviteType: InviteType
): Promise<IssuedInvitation | ArcsialError> {
  const recipient = await findProfileByHandle(recipientHandle);
  if (!recipient || (await isBlockedEitherWay(senderId, recipient.userId))) return USER_NOT_FOUND;
  if (recipient.userId === senderId)
    return fail(400, 'CANNOT_INVITE_SELF', 'No puedes invitarte a ti mismo');
  const base = { senderId, recipientId: recipient.userId, inviteType };
  if (inviteType === 'CONTACT') {
    if (await areContacts(senderId, recipient.userId)) {
      return fail(409, 'ALREADY_CONTACTS', 'Ya son contactos');
    }
    return insertWithinQuotas({ ...base, tenantId: null });
  }
  const tenantId = await universeGates(base);
  if (typeof tenantId !== 'number') return tenantId;
  return insertWithinQuotas({ ...base, tenantId });
}

/** GET /v1/social/invitations — primero vence las PENDING caducadas (sin cron), luego lista. */
export async function listInvitations(userId: number): Promise<InboxEntry[]> {
  await InvitationsRepository.expirePendingFor(userId);
  return listInbox(userId);
}

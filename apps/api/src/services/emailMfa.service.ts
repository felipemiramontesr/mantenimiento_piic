import { randomUUID } from 'node:crypto';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import db from './db';
import * as MfaRepository from './mfa.repository';
import * as SessionRepository from './authSession.repository';
import EncryptionService from './encryption';
import {
  EMAIL_CODE_PATTERN,
  generateBackupCodes,
  generateEmailCode,
  normalizeEmailCode,
} from './totp.service';
import { isTotpRequired } from './mfaPolicy.service';
import { recordFailedAttempt } from './mfa.service';
import { buildMfaCodeEmail, MfaCodePurpose } from './mailTemplates';
import { recordAuditLog } from './auditService';
import type { MailTransport } from './mailTransport';

/**
 * FC195 F2 — segundo factor por correo (solo Arc; Ω y MU en cualquier universo usan TOTP,
 * Invariante 9). El código es de 8 caracteres (D-Ω4), se guarda SOLO como hash Argon2id (D-Ω5),
 * caduca a los 10 min por el reloj de la DB y admite 5 intentos y 3 envíos por reto. El envío completo
 * pasa por el `MailTransport` del API (D-Ω3: 0 PHP). Honestidad de factor (Invariante 2): prueba
 * acceso al buzón, no posesión de un dispositivo — no es NIST AAL2.
 */

/** Fallo de negocio con su código HTTP; la ruta solo lo traduce. */
export interface EmailMfaFailure {
  readonly ok: false;
  readonly status: 400 | 401 | 403 | 409 | 429 | 503;
  readonly code: string;
  readonly message: string;
}

function failure(
  status: EmailMfaFailure['status'],
  code: string,
  message: string
): EmailMfaFailure {
  return { ok: false, status, code, message };
}

const METHOD_NOT_ALLOWED = failure(
  403,
  'MFA_METHOD_NOT_ALLOWED',
  'Tu cuenta debe usar la app autenticadora (TOTP)'
);
const CHALLENGE_CLOSED = failure(
  401,
  'TOKEN_EXPIRED_OR_REVOKED',
  'El código expiró o el reto fue revocado — solicita uno nuevo'
);
const INVALID_CODE = failure(401, 'MFA_INVALID_CODE', 'El código ingresado no es válido');

/** `felipe@gmail.com` → `fe•••@gmail.com` (mismo formato que la tarjeta de Diagnóstico). */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '•••';
  return `${email.slice(0, Math.min(2, at))}•••${email.slice(at)}`;
}

interface MfaUser {
  roleId: number;
  email: string | null;
}

/** Usuario activo con su correo descifrado (`null` si no tiene). */
async function loadActiveUser(userId: number): Promise<MfaUser | null> {
  const row = await SessionRepository.findActiveUserWithRoleAndDepartmentById(userId);
  if (!row) return null;
  return {
    roleId: row.role_id as number,
    email: row.email ? EncryptionService.decrypt(row.email as string) : null,
  };
}

/** Envía el código y dice si salió. El destinatario es SIEMPRE el correo registrado (anti-relay). */
async function sendCode(
  transport: MailTransport,
  to: string,
  code: string,
  purpose: MfaCodePurpose
): Promise<boolean> {
  const sent = await transport.send({ to, ...buildMfaCodeEmail(code, purpose) });
  return sent.status === 'sent';
}

/** Código nuevo y su hash Argon2id; el texto plano solo vive para enviarlo. */
async function newCode(): Promise<{ code: string; codeHash: string }> {
  const code = generateEmailCode();
  return { code, codeHash: await argon2Hash(code) };
}

export interface EmailLoginChallenge {
  readonly challengeId: string;
  readonly maskedEmail: string | null;
  readonly codeSent: boolean;
}

/** `/login` de un Arc con 2FA por correo: crea el reto y envía el código. Si el correo no sale, el
 *  reto existe igual: el usuario puede pedir reenvío o usar un código de respaldo. */
export async function startLoginChallenge(
  userId: number,
  transport: MailTransport
): Promise<EmailLoginChallenge> {
  const { code, codeHash } = await newCode();
  const challengeId = randomUUID();
  await MfaRepository.insertEmailChallenge(challengeId, userId, codeHash);
  const user = await loadActiveUser(userId);
  if (!user?.email) return { challengeId, maskedEmail: null, codeSent: false };
  const codeSent = await sendCode(transport, user.email, code, 'login');
  return { challengeId, maskedEmail: maskEmail(user.email), codeSent };
}

export type BeginEmailSetupResult =
  | { readonly ok: true; readonly challengeId: string; readonly maskedEmail: string }
  | EmailMfaFailure;

/** Inicia el enrolamiento: solo Arc, sin otro método confirmado y con correo registrado. El reto
 *  se guarda solo si el correo salió: sin código entregado no hay nada que confirmar. */
export async function beginEmailSetup(
  userId: number,
  transport: MailTransport
): Promise<BeginEmailSetupResult> {
  const user = await loadActiveUser(userId);
  if (!user) return CHALLENGE_CLOSED;
  if (await isTotpRequired(userId, user.roleId)) return METHOD_NOT_ALLOWED;
  const credentials = await MfaRepository.listCredentials(userId);
  if (credentials.some((c) => c.confirmed)) {
    return failure(409, 'MFA_ALREADY_ENROLLED', 'Ya tienes la verificación en dos pasos activa');
  }
  if (!user.email) {
    return failure(400, 'EMAIL_NOT_CONFIGURED', 'Tu cuenta no tiene un correo registrado');
  }
  const { code, codeHash } = await newCode();
  if (!(await sendCode(transport, user.email, code, 'setup'))) {
    return failure(503, 'MAIL_DELIVERY_FAILED', 'No se pudo enviar el correo — intenta más tarde');
  }
  const challengeId = randomUUID();
  await MfaRepository.insertEmailChallenge(challengeId, userId, codeHash);
  return { ok: true, challengeId, maskedEmail: maskEmail(user.email) };
}

/** El reto existe, es de correo, pertenece a `userId` y no fue revocado. */
function isUsersEmailChallenge(
  challenge: MfaRepository.MfaChallengeRow | null,
  userId: number
): challenge is MfaRepository.MfaChallengeRow {
  return (
    challenge !== null &&
    challenge.user_id === userId &&
    challenge.channel === 'email' &&
    !challenge.revoked
  );
}

/** Reto de correo del usuario, abierto y con el código vigente; si no, `null`. */
async function findOpenEmailChallenge(
  userId: number,
  challengeId: string
): Promise<MfaRepository.MfaChallengeRow | null> {
  const challenge = await MfaRepository.findChallengeById(challengeId);
  if (!isUsersEmailChallenge(challenge, userId)) return null;
  return challenge.is_live ? challenge : null;
}

async function matchesChallengeCode(
  challenge: MfaRepository.MfaChallengeRow,
  code: string
): Promise<boolean> {
  const normalized = normalizeEmailCode(code);
  if (!EMAIL_CODE_PATTERN.test(normalized) || !challenge.code_hash) return false;
  return argon2Verify(challenge.code_hash, normalized);
}

/** En UNA transacción: quema el reto, activa la credencial `email`, retira cualquier otro método
 *  y respaldos previos, guarda los 8 respaldos nuevos y sella `email_verified_at`. */
async function persistEmailEnrollment(
  userId: number,
  challengeRowId: number,
  backupHashes: string[]
): Promise<void> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await MfaRepository.revokeChallenge(challengeRowId, connection);
    await MfaRepository.confirmEmailCredential(userId, connection);
    await MfaRepository.replaceOtherMethods(userId, 'email', connection);
    await MfaRepository.insertBackupCodes(userId, backupHashes, connection);
    await MfaRepository.markEmailVerified(userId, connection);
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

export type ConfirmEmailSetupResult =
  | { readonly ok: true; readonly backupCodes: string[] }
  | EmailMfaFailure;

/** Confirma el enrolamiento con el código recibido (prueba de que el buzón es suyo) y responde los
 *  8 códigos de respaldo UNA sola vez. Un fallo cuenta para el límite de 5 intentos. */
export async function confirmEmailSetup(
  userId: number,
  challengeId: string,
  code: string
): Promise<ConfirmEmailSetupResult> {
  const user = await loadActiveUser(userId);
  if (!user) return CHALLENGE_CLOSED;
  if (await isTotpRequired(userId, user.roleId)) return METHOD_NOT_ALLOWED;
  const challenge = await findOpenEmailChallenge(userId, challengeId);
  if (!challenge) return CHALLENGE_CLOSED;
  if (!(await matchesChallengeCode(challenge, code))) {
    await recordFailedAttempt(challenge);
    return INVALID_CODE;
  }
  const backupCodes = generateBackupCodes();
  const backupHashes = await Promise.all(backupCodes.map((plain) => argon2Hash(plain)));
  await persistEmailEnrollment(userId, challenge.id, backupHashes);
  await recordAuditLog({
    entity_type: 'user',
    entity_id: String(userId),
    action: 'UPDATE',
    snapshot_after: { mfaMethod: 'email', emailVerified: true },
    reason: 'FC195 F2 — el usuario activa el 2FA por correo',
    user_id: userId,
  });
  return { ok: true, backupCodes };
}

export type ResendEmailCodeResult =
  | {
      readonly ok: true;
      readonly maskedEmail: string | null;
      readonly codeSent: boolean;
      readonly resendsLeft: number;
    }
  | EmailMfaFailure;

const RESEND_COOLDOWN = failure(
  429,
  'RESEND_COOLDOWN_ACTIVE',
  'Espera un minuto antes de pedir otro código'
);

/** Reenvío (login o enrolamiento): código NUEVO — el anterior deja de servir — con 60 s de espera y
 *  un máximo de 2 reenvíos por reto. La condición se aplica en el UPDATE mismo (carrera segura). */
export async function resendEmailCode(
  userId: number,
  challengeId: string,
  purpose: MfaCodePurpose,
  transport: MailTransport
): Promise<ResendEmailCodeResult> {
  const challenge = await MfaRepository.findChallengeById(challengeId);
  if (!isUsersEmailChallenge(challenge, userId)) return CHALLENGE_CLOSED;
  if (challenge.resend_count >= MfaRepository.MAX_EMAIL_RESENDS) {
    return failure(429, 'RESEND_LIMIT_EXCEEDED', 'Ya no quedan reenvíos — inicia de nuevo');
  }
  if (!challenge.cooldown_over) return RESEND_COOLDOWN;
  const { code, codeHash } = await newCode();
  if (!(await MfaRepository.rotateEmailChallengeCode(challenge.id, codeHash))) {
    return RESEND_COOLDOWN;
  }
  const user = await loadActiveUser(userId);
  const resendsLeft = MfaRepository.MAX_EMAIL_RESENDS - (challenge.resend_count + 1);
  if (!user?.email) return { ok: true, maskedEmail: null, codeSent: false, resendsLeft };
  const codeSent = await sendCode(transport, user.email, code, purpose);
  return { ok: true, maskedEmail: maskEmail(user.email), codeSent, resendsLeft };
}

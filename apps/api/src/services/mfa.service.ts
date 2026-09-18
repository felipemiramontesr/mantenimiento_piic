import { randomUUID } from 'node:crypto';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import db from './db';
import * as MfaRepository from './mfa.repository';
import * as TotpService from './totp.service';
import EncryptionService from './encryption';
import { refresh as refreshSession, RefreshResult } from './authSession.service';
import { recordAuditLog } from './auditService';

/**
 * FC185 — Sovereign_MFA_TOTP_Two_Step_Authentication. F1 (`beginSetup`/`confirmSetup`) orquesta
 * el enrolamiento sobre `totp.service.ts` (motor puro) y `mfa.repository.ts` (SQL). F2
 * (`createChallenge`/`verifyChallenge`) orquesta el canje de un código ya enrolado por una sesión
 * completa, reusando `authSession.service.ts::refresh()` para reconstruir el mismo contexto de
 * auth (tenantId/permissions/ownerType) que un login normal — 0 duplicación de esa lógica.
 */

export interface BeginSetupResult {
  secretBase32: string;
  otpauthUri: string;
}

/** POST /v1/auth/mfa/setup — genera un secreto TOTP nuevo, lo cifra (`EncryptionService`,
 *  invariante 2) y lo guarda como PENDIENTE (`is_confirmed = 0`). El secreto en texto plano solo
 *  existe en esta respuesta — nunca se persiste ni se vuelve a mostrar; llamar a `setup` de nuevo
 *  antes de confirmar reemplaza el pendiente (upsert), no acumula filas huérfanas. */
export async function beginSetup(userId: number, accountLabel: string): Promise<BeginSetupResult> {
  const secretBase32 = TotpService.generateTotpSecret();
  const secretEncrypted = EncryptionService.encrypt(secretBase32);
  await MfaRepository.upsertPendingCredential(userId, 'totp', secretEncrypted);
  return { secretBase32, otpauthUri: TotpService.buildTotpUri(secretBase32, accountLabel) };
}

export type ConfirmSetupResult =
  | { ok: true; backupCodes: string[] }
  | { ok: false; status: 404; code: 'SETUP_NOT_FOUND'; message: string }
  | { ok: false; status: 401; code: 'MFA_INVALID_CODE'; message: string };

function setupNotFound(): ConfirmSetupResult {
  return {
    ok: false,
    status: 404,
    code: 'SETUP_NOT_FOUND',
    message: 'No hay un enrolamiento MFA pendiente para confirmar',
  };
}

/** POST /v1/auth/mfa/confirm — exige un primer código TOTP válido antes de activar el MFA
 *  (invariante: nunca queda enrolado un secreto que el usuario no demostró poder usar). Genera y
 *  persiste (hash Argon2id, R7 340_AN) 8 códigos de respaldo de un solo uso en la MISMA
 *  transacción que confirma la credencial — atómico, mismo molde que
 *  `publicSignup.service.ts::runSignupTransaction` (FC177 F2). */
export async function confirmSetup(userId: number, code: string): Promise<ConfirmSetupResult> {
  const credential = await MfaRepository.findCredentialByUserId(userId, 'totp');
  if (!credential || credential.is_confirmed) {
    return setupNotFound();
  }
  const secretBase32 = EncryptionService.decrypt(credential.secret_encrypted);
  const verification = TotpService.verifyTotpCode(secretBase32, code, {
    lastUsedStep: credential.last_used_step,
  });
  if (!verification.valid) {
    return {
      ok: false,
      status: 401,
      code: 'MFA_INVALID_CODE',
      message: 'El código ingresado no es válido',
    };
  }
  const plainBackupCodes = TotpService.generateBackupCodes();
  const codeHashes = await Promise.all(plainBackupCodes.map((plain) => argon2Hash(plain)));

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await MfaRepository.confirmCredential(
      credential.id,
      verification.matchedStep as number,
      connection
    );
    await MfaRepository.insertBackupCodes(userId, codeHashes, connection);
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  return { ok: true, backupCodes: plainBackupCodes };
}

const MAX_MFA_ATTEMPTS = 5;
const TOTP_CODE_PATTERN = /^\d{6}$/;

/** POST /login (Scenario 1, FC185) — crea la fila de rastreo del reto; la ruta firma el
 *  `mfaToken` (JWT, TTL 5m) con este `challengeId` embebido — nunca al revés, el JWT nunca toca
 *  este servicio (Cond.R-130-E4). */
export async function createChallenge(userId: number): Promise<string> {
  const challengeId = randomUUID();
  await MfaRepository.insertChallenge(challengeId, userId);
  return challengeId;
}

export type VerifyChallengeResult =
  | Extract<RefreshResult, { ok: true }>
  | { ok: false; status: 401; code: 'MFA_INVALID_CODE'; message: string }
  | { ok: false; status: 401; code: 'TOKEN_EXPIRED_OR_REVOKED'; message: string };

function invalidCodeResult(): VerifyChallengeResult {
  return {
    ok: false,
    status: 401,
    code: 'MFA_INVALID_CODE',
    message: 'El código ingresado no es válido',
  };
}

function revokedResult(): VerifyChallengeResult {
  return {
    ok: false,
    status: 401,
    code: 'TOKEN_EXPIRED_OR_REVOKED',
    message: 'El reto de autenticación expiró o fue revocado — inicia sesión de nuevo',
  };
}

/** Rama TOTP de `verifyChallenge` — mismo motor y misma disciplina R6 (last_used_step) que
 *  `confirmSetup` (F1), pero contra una credencial YA confirmada. */
async function tryTotpCode(userId: number, code: string): Promise<boolean> {
  const credential = await MfaRepository.findCredentialByUserId(userId, 'totp');
  if (!credential?.is_confirmed) return false;
  const secretBase32 = EncryptionService.decrypt(credential.secret_encrypted);
  const verification = TotpService.verifyTotpCode(secretBase32, code, {
    lastUsedStep: credential.last_used_step,
  });
  if (!verification.valid) return false;
  await MfaRepository.updateLastUsedStep(credential.id, verification.matchedStep as number);
  return true;
}

/** Rama de código de respaldo (Scenario 4) — comparación secuencial contra hasta 8 hashes
 *  Argon2id (no son indexables por el código en claro); se detiene en el primer match y quema el
 *  código atómicamente (`markBackupCodeUsed`, guardia `used_at IS NULL` contra doble consumo). */
async function tryBackupCode(userId: number, code: string): Promise<boolean> {
  const candidates = await MfaRepository.findUnusedBackupCodes(userId);
  // Secuencial a propósito: cada eslabón espera al anterior y, una vez hay un match, ya no lanza
  // más verificaciones Argon2id (no hasta 8 en paralelo por cada intento). `reduce` en vez de
  // `for`/`for-of`: satisface a la vez Sonar S4138 y la regla ESLint `no-restricted-syntax`.
  const matchedId = await candidates.reduce<Promise<number | null>>(async (previous, candidate) => {
    const alreadyMatched = await previous;
    if (alreadyMatched !== null) return alreadyMatched;
    return (await argon2Verify(candidate.code_hash, code)) ? candidate.id : null;
  }, Promise.resolve(null));
  return matchedId === null ? false : MfaRepository.markBackupCodeUsed(matchedId);
}

/** Camino de fallo de `verifyChallenge`: cuenta el intento y revoca el reto al llegar al límite.
 *  Extraído (no inline en un `if` con varios `await`) porque V8 reporta un conteo de rama
 *  negativo para el "else" implícito de ese patrón, que SonarCloud lee como condición sin
 *  cubrir aunque ambas ramas estén probadas. */
async function registerFailedAttempt(
  challenge: MfaRepository.MfaChallengeRow
): Promise<VerifyChallengeResult> {
  await MfaRepository.incrementChallengeAttempts(challenge.id);
  if (challenge.attempts_used + 1 >= MAX_MFA_ATTEMPTS) {
    await MfaRepository.revokeChallenge(challenge.id);
  }
  return invalidCodeResult();
}

/** Elige la rama TOTP o de respaldo según el formato del código. Helper síncrono (los brazos
 *  devuelven la promesa, no la esperan): un ternario con `await` en sus brazos justo antes de un
 *  `if` hace que V8 reporte un conteo de rama negativo para ese `if` (límite de v8→istanbul que
 *  SonarCloud lee como condición sin cubrir aunque ambas ramas estén probadas). */
function verifyCodeForUser(userId: number, code: string): Promise<boolean> {
  return TOTP_CODE_PATTERN.test(code) ? tryTotpCode(userId, code) : tryBackupCode(userId, code);
}

/** POST /v1/auth/mfa/verify (Scenario 2/3/4, FC185). `challengeId` ya viene decodificado y
 *  validado (firma + scope `mfa_challenge`) por la ruta — aquí solo se resuelve el estado de
 *  negocio: reto revocado/agotado (Scenario 3), código TOTP o de respaldo válido (Scenario 2/4,
 *  un código de 6 dígitos nunca coincide con el formato `XXXXX-XXXXX` de un backup, así que el
 *  orden de intento es inequívoco), o un fallo que cuenta para el límite de 5 intentos. */
export async function verifyChallenge(
  challengeId: string,
  code: string
): Promise<VerifyChallengeResult> {
  const challenge = await MfaRepository.findChallengeById(challengeId);
  if (!challenge || challenge.revoked) {
    return revokedResult();
  }

  const isValid = await verifyCodeForUser(challenge.user_id, code);

  if (!isValid) return registerFailedAttempt(challenge);

  // Un solo uso — igual que un código de respaldo, un challenge no se reutiliza ni tras un éxito.
  await MfaRepository.revokeChallenge(challenge.id);
  const session = await refreshSession(challenge.user_id, undefined);
  return session.ok ? session : invalidCodeResult();
}

export type ResetMfaResult =
  | { ok: true }
  | { ok: false; status: 404; code: 'MFA_NOT_ENROLLED'; message: string };

/** `POST /v1/cosmology/users/:id/mfa/reset` (Ω-exclusivo, invariante "0 auto-reset"). Borra la
 *  credencial (pendiente o confirmada) y los backups de `targetUserId` en una sola TX, dejándolo
 *  listo para re-enrolar desde cero — el único camino de "perdí mi autenticador" que existe, y un
 *  usuario nunca puede recorrerlo por sí mismo. 404 si no hay nada que resetear (cubre también un
 *  `targetUserId` inexistente: la FK de `user_mfa_credentials` garantiza que solo usuarios reales
 *  pueden tener una fila aquí). Vive aquí, no en `cosmology.service.ts` (cuya ruta HTTP es
 *  `/v1/cosmology/users/:id/mfa/reset`), porque ese archivo ya está en el límite de 400 líneas de
 *  ESLint — el dominio real de esta operación es MFA, no cosmología. */
export async function resetUserMfa(
  targetUserId: number,
  callerId: number
): Promise<ResetMfaResult> {
  const credential = await MfaRepository.findCredentialByUserId(targetUserId, 'totp');
  if (!credential) {
    return {
      ok: false,
      status: 404,
      code: 'MFA_NOT_ENROLLED',
      message: 'El usuario no tiene MFA configurado',
    };
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await MfaRepository.deleteMfaCredentialAndBackups(targetUserId, connection);
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  await recordAuditLog({
    entity_type: 'user',
    entity_id: String(targetUserId),
    action: 'DELETE',
    snapshot_after: { mfaReset: true },
    reason: 'FC185 F2 — Ω resetea MFA de un usuario (invariante: 0 auto-reset)',
    user_id: callerId,
  });
  return { ok: true };
}

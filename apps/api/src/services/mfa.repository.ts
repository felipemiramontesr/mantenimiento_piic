import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC185 F1 — Sovereign_MFA_TOTP_Two_Step_Authentication. Frontera SQL de `user_mfa_credentials`
 * / `user_mfa_backup_codes` (migración 176) — mismo molde de `Executor`/`db` por defecto que
 * `universeUserLinking.repository.ts`.
 */
type Executor = Pool | PoolConnection;

export type MfaCredentialType = 'totp' | 'webauthn' | 'email';

export interface MfaCredentialRow extends RowDataPacket {
  id: number;
  user_id: number;
  type: MfaCredentialType;
  /** FC195 (migración 178) — NULL en una credencial `email`, que no tiene secreto. */
  secret_encrypted: string | null;
  is_confirmed: number;
  last_used_step: number | null;
}

interface CredentialSummaryRow extends RowDataPacket {
  type: MfaCredentialType;
  is_confirmed: number;
}

/** FC195 — tipo y estado de TODAS las credenciales del usuario (pendientes y confirmadas). */
export async function listCredentials(
  userId: number,
  executor: Executor = db
): Promise<{ type: MfaCredentialType; confirmed: boolean }[]> {
  const [rows] = await executor.execute<CredentialSummaryRow[]>(
    'SELECT type, is_confirmed FROM user_mfa_credentials WHERE user_id = ?',
    [userId]
  );
  return rows.map((r) => ({ type: r.type, confirmed: Boolean(r.is_confirmed) }));
}

/** FC195 F2 — activa la credencial `email` ya confirmada (el código recibido fue la prueba). */
export async function confirmEmailCredential(
  userId: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `INSERT INTO user_mfa_credentials (user_id, type, secret_encrypted, is_confirmed, last_used_at)
     VALUES (?, 'email', NULL, 1, NOW())
     ON DUPLICATE KEY UPDATE
       secret_encrypted = NULL,
       is_confirmed = 1,
       last_used_step = NULL,
       last_used_at = NOW()`,
    [userId]
  );
}

/** FC195 F2 — un solo método principal: al confirmar un método se borran las credenciales de
 *  cualquier otro tipo y los códigos de respaldo previos (el caller inserta los 8 nuevos en la
 *  misma transacción). */
export async function replaceOtherMethods(
  userId: number,
  keepType: MfaCredentialType,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'DELETE FROM user_mfa_credentials WHERE user_id = ? AND type <> ?',
    [userId, keepType]
  );
  await executor.execute<ResultSetHeader>('DELETE FROM user_mfa_backup_codes WHERE user_id = ?', [
    userId,
  ]);
}

/** FC195 F2 (absorbe FC187 F5) — sella el correo como verificado; conserva la primera fecha. */
export async function markEmailVerified(userId: number, executor: Executor = db): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?',
    [userId]
  );
}

/** UNIQUE(user_id, type) — reiniciar el enrolamiento antes de confirmar reemplaza el secreto
 *  pendiente en vez de acumular filas huérfanas; `last_used_step` se limpia junto con él. */
export async function upsertPendingCredential(
  userId: number,
  type: MfaCredentialType,
  secretEncrypted: string,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `INSERT INTO user_mfa_credentials (user_id, type, secret_encrypted, is_confirmed)
     VALUES (?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE
       secret_encrypted = VALUES(secret_encrypted),
       is_confirmed = 0,
       last_used_step = NULL`,
    [userId, type, secretEncrypted]
  );
}

/** Credencial MFA (pendiente o confirmada) de un usuario para un `type` dado, o `null`. */
export async function findCredentialByUserId(
  userId: number,
  type: MfaCredentialType,
  executor: Executor = db
): Promise<MfaCredentialRow | null> {
  const [rows] = await executor.execute<MfaCredentialRow[]>(
    `SELECT id, user_id, type, secret_encrypted, is_confirmed, last_used_step
     FROM user_mfa_credentials
     WHERE user_id = ? AND type = ?`,
    [userId, type]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** F1 — confirma el enrolamiento y graba de una vez el step consumido por el propio código de
 *  confirmación, para que R6 (anti-replay) ya aplique desde el primer código válido y no deje una
 *  ventana entre "confirmar" y el primer /mfa/verify real de F2. */
export async function confirmCredential(
  id: number,
  lastUsedStep: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `UPDATE user_mfa_credentials
     SET is_confirmed = 1, last_used_step = ?, last_used_at = NOW()
     WHERE id = ?`,
    [lastUsedStep, id]
  );
}

/** Inserción masiva de los 8 códigos de respaldo (ya hasheados por el caller) — mismo patrón de
 *  placeholders generados que `workOrderService.ts` usa para su INSERT masivo de tareas. */
export async function insertBackupCodes(
  userId: number,
  codeHashes: string[],
  executor: Executor = db
): Promise<void> {
  if (codeHashes.length === 0) return;
  const placeholders = codeHashes.map(() => '(?, ?)').join(', ');
  const values = codeHashes.flatMap((hash) => [userId, hash]);
  await executor.execute<ResultSetHeader>(
    `INSERT INTO user_mfa_backup_codes (user_id, code_hash) VALUES ${placeholders}`,
    values
  );
}

/** F2 — graba el step consumido por un login ya confirmado (a diferencia de `confirmCredential`,
 *  no toca `is_confirmed` — la credencial ya estaba activa). */
export async function updateLastUsedStep(
  id: number,
  step: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'UPDATE user_mfa_credentials SET last_used_step = ?, last_used_at = NOW() WHERE id = ?',
    [step, id]
  );
}

/** F2 — Ω-exclusivo (invariante: "0 auto-reset"). Borra la credencial confirmada/pendiente y los
 *  backups de un usuario en una sola TX -- deja al usuario en el mismo estado "sin MFA" que antes
 *  de enrolarse, listo para re-enrolar desde cero. */
export async function deleteMfaCredentialAndBackups(
  userId: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>('DELETE FROM user_mfa_credentials WHERE user_id = ?', [
    userId,
  ]);
  await executor.execute<ResultSetHeader>('DELETE FROM user_mfa_backup_codes WHERE user_id = ?', [
    userId,
  ]);
}

export interface MfaBackupCodeRow extends RowDataPacket {
  id: number;
  code_hash: string;
}

/** Códigos de respaldo aún no consumidos de un usuario — se comparan uno a uno (Argon2id, hasta 8
 *  verificaciones) porque el hash no es indexable por el código en claro. */
export async function findUnusedBackupCodes(
  userId: number,
  executor: Executor = db
): Promise<MfaBackupCodeRow[]> {
  const [rows] = await executor.execute<MfaBackupCodeRow[]>(
    'SELECT id, code_hash FROM user_mfa_backup_codes WHERE user_id = ? AND used_at IS NULL',
    [userId]
  );
  return rows;
}

/** Quema atómicamente un código de respaldo -- `used_at IS NULL` en el WHERE evita una carrera
 *  donde el mismo código se consuma dos veces; `affectedRows === 0` significa que alguien más ya
 *  lo usó entre el SELECT y este UPDATE. */
export async function markBackupCodeUsed(id: number, executor: Executor = db): Promise<boolean> {
  const [result] = await executor.execute<ResultSetHeader>(
    'UPDATE user_mfa_backup_codes SET used_at = NOW() WHERE id = ? AND used_at IS NULL',
    [id]
  );
  return result.affectedRows > 0;
}

export type MfaChallengeChannel = 'totp' | 'email';

export interface MfaChallengeRow extends RowDataPacket {
  id: number;
  challenge_id: string;
  user_id: number;
  attempts_used: number;
  revoked: number;
  /** FC195 — `totp` en todos los retos previos a la migración 178 (default de la columna). */
  channel: MfaChallengeChannel;
  code_hash: string | null;
  resend_count: number;
  /** Calculado con el reloj de la DB: 1 si el código de correo sigue vigente (`expires_at`). */
  is_live: number;
  /** Calculado con el reloj de la DB: 1 si ya pasaron 60 s desde el último envío. */
  cooldown_over: number;
}

/** FC195 F2 — 1 envío inicial + 2 reenvíos = 3 envíos por reto. La vida del código (10 min) y la
 *  espera entre envíos (60 s) van literales en el SQL, en el reloj de la DB (Invariante 4). */
export const MAX_EMAIL_RESENDS = 2;

/** FC195 F2 — reto por correo: guarda SOLO el hash Argon2id del código, con TTL de 10 min. */
export async function insertEmailChallenge(
  challengeId: string,
  userId: number,
  codeHash: string,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `INSERT INTO mfa_challenges
       (challenge_id, user_id, channel, code_hash, expires_at, last_sent_at)
     VALUES (?, ?, 'email', ?, NOW() + INTERVAL 10 MINUTE, NOW())`,
    [challengeId, userId, codeHash]
  );
}

/** FC195 F2 — reenvío: reemplaza el código (el anterior deja de servir) solo si el reto sigue
 *  activo, quedan reenvíos y ya pasó la espera. Un solo UPDATE: dos reenvíos simultáneos no
 *  pueden saltarse el límite. `false` = no se cumplió alguna condición. */
export async function rotateEmailChallengeCode(
  id: number,
  codeHash: string,
  executor: Executor = db
): Promise<boolean> {
  const [result] = await executor.execute<ResultSetHeader>(
    `UPDATE mfa_challenges
     SET code_hash = ?, expires_at = NOW() + INTERVAL 10 MINUTE, last_sent_at = NOW(),
         resend_count = resend_count + 1
     WHERE id = ? AND channel = 'email' AND revoked = 0
       AND resend_count < 2 AND last_sent_at <= NOW() - INTERVAL 60 SECOND`,
    [codeHash, id]
  );
  return result.affectedRows > 0;
}

/** F2 — crea la fila de rastreo del reto de login (Scenario 1/3 del FC). `challengeId` es el UUID
 *  embebido en el `mfaToken` firmado por la ruta, nunca el JWT completo. */
export async function insertChallenge(
  challengeId: string,
  userId: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'INSERT INTO mfa_challenges (challenge_id, user_id) VALUES (?, ?)',
    [challengeId, userId]
  );
}

/** Fila de rastreo del reto de login (intentos usados, revocado), o `null` si no existe. */
export async function findChallengeById(
  challengeId: string,
  executor: Executor = db
): Promise<MfaChallengeRow | null> {
  const [rows] = await executor.execute<MfaChallengeRow[]>(
    `SELECT id, challenge_id, user_id, attempts_used, revoked, channel, code_hash, resend_count,
            (expires_at IS NOT NULL AND expires_at > NOW()) AS is_live,
            (last_sent_at IS NULL OR last_sent_at <= NOW() - INTERVAL 60 SECOND) AS cooldown_over
     FROM mfa_challenges WHERE challenge_id = ?`,
    [challengeId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Scenario 3 — máximo 5 intentos fallidos: incrementa y regresa el nuevo total para que el
 *  caller decida si este fue el fallo que agota el presupuesto. */
export async function incrementChallengeAttempts(
  id: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'UPDATE mfa_challenges SET attempts_used = attempts_used + 1 WHERE id = ?',
    [id]
  );
}

/** Revoca el reto -- al 5to fallo (Scenario 3) o al primer éxito (un challenge es de un solo uso
 *  en ambos casos, mismo criterio que un código de respaldo). */
export async function revokeChallenge(id: number, executor: Executor = db): Promise<void> {
  await executor.execute<ResultSetHeader>('UPDATE mfa_challenges SET revoked = 1 WHERE id = ?', [
    id,
  ]);
}

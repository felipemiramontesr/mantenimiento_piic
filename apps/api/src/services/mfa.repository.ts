import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC185 F1 — Sovereign_MFA_TOTP_Two_Step_Authentication. Frontera SQL de `user_mfa_credentials`
 * / `user_mfa_backup_codes` (migración 176) — mismo molde de `Executor`/`db` por defecto que
 * `universeUserLinking.repository.ts`.
 */
type Executor = Pool | PoolConnection;

export type MfaCredentialType = 'totp' | 'webauthn';

export interface MfaCredentialRow extends RowDataPacket {
  id: number;
  user_id: number;
  type: MfaCredentialType;
  secret_encrypted: string;
  is_confirmed: number;
  last_used_step: number | null;
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

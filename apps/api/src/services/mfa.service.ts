import { hash as argon2Hash } from '@node-rs/argon2';
import db from './db';
import * as MfaRepository from './mfa.repository';
import * as TotpService from './totp.service';
import EncryptionService from './encryption';

/**
 * FC185 F1 — Sovereign_MFA_TOTP_Two_Step_Authentication. Orquesta el enrolamiento (setup +
 * confirm) sobre `totp.service.ts` (motor puro) y `mfa.repository.ts` (SQL). El login de dos
 * pasos (verificar un MFA ya confirmado) es F2 — este archivo solo cubre el alta.
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

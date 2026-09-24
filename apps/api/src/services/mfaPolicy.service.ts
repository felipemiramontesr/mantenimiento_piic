import * as MfaRepository from './mfa.repository';
import * as CosmonautRepository from './cosmonaut.repository';

/**
 * FC195 — política única del segundo factor. La consultan login, refresh, switch-tenant y el
 * enrolamiento por correo, así que "quién debe usar qué" se decide en un solo lugar:
 *  - D-Ω1: el 2FA es obligatorio para cualquier usuario (sin periodo de gracia, D-Ω7).
 *  - D-Ω6 / R10 / Invariante 9: Ω y quien sea MU en CUALQUIER universo solo cuentan con TOTP.
 *  - Arc (con o sin universo): TOTP o correo, un solo método.
 */

export type MfaMethod = 'totp' | 'email';

export interface MfaStatus {
  /** Ω o MU en algún universo: solo TOTP satisface el 2FA. */
  readonly totpRequired: boolean;
  /** Método con el que se reta el login, o `null` si aún no tiene uno que le sirva. */
  readonly loginChannel: MfaMethod | null;
  /** Métodos que puede enrolar. */
  readonly allowedMethods: readonly MfaMethod[];
}

/** Ω (roleId 0) sin consultar membresías; cualquier otro, si es MU en algún universo. */
export async function isTotpRequired(userId: number, roleId: number): Promise<boolean> {
  if (roleId === 0) return true;
  return CosmonautRepository.hasAnyMuMembership(userId);
}

function pickLoginChannel(confirmed: readonly string[], totpRequired: boolean): MfaMethod | null {
  if (confirmed.includes('totp')) return 'totp';
  if (!totpRequired && confirmed.includes('email')) return 'email';
  return null;
}

/** Estado 2FA del usuario: con qué se le reta y qué puede enrolar. Una credencial `email` de
 *  alguien que ya es MU no cuenta (Invariante 9): debe enrolar TOTP. */
export async function resolveMfaStatus(userId: number, roleId: number): Promise<MfaStatus> {
  const [totpRequired, credentials] = await Promise.all([
    isTotpRequired(userId, roleId),
    MfaRepository.listCredentials(userId),
  ]);
  const confirmed = credentials.filter((c) => c.confirmed).map((c) => c.type);
  return {
    totpRequired,
    loginChannel: pickLoginChannel(confirmed, totpRequired),
    allowedMethods: totpRequired ? ['totp'] : ['totp', 'email'],
  };
}

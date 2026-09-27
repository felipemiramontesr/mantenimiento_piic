import { createHmac } from 'node:crypto';
import * as ThrottleRepository from './authThrottle.repository';

/**
 * FC199 F2 — freno progresivo del login y tope de correos por destinatario (Cond.R-199 P3).
 *
 * Login: la llave es el PAR usuario|IP. Así un atacante no puede frenar a Ω desde otra IP (Ω
 * conserva su propio par) y nunca hay bloqueo permanente: tras `LOGIN_FREE_FAILURES` fallos
 * seguidos, cada intento espera 1, 2, 4… s desde el anterior, con techo de 60 s (`Retry-After`),
 * sin `sleep` en el handler. El ataque distribuido contra UNA cuenta lo cubre el reto PoW de F3.
 *
 * Correo: máximo `MAIL_QUOTA_PER_DAY` códigos al mismo destinatario en 24 h (setup y reenvío),
 * para que nadie use nuestro SMTP contra un buzón ajeno.
 */

export const LOGIN_WINDOW_SECONDS = 15 * 60;
export const LOGIN_FREE_FAILURES = 5;
export const LOGIN_MAX_DELAY_SECONDS = 60;
export const MAIL_QUOTA_PER_DAY = 5;
const MAIL_WINDOW_SECONDS = 24 * 60 * 60;

/** Misma clave que firma los JWT (obligatoria en prod, `index.ts`), con prefijo de dominio propio:
 *  la llave HMAC no sirve para nada más y la tabla no guarda usuarios, IPs ni correos en claro. */
function throttleSecret(): string {
  return process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-prod';
}

/** Llave HMAC-SHA256 (hex, 64) de `<ámbito>:<identificador>`. */
export function throttleKey(scope: string, identifier: string): string {
  return createHmac('sha256', throttleSecret())
    .update(`auth-throttle|${scope}:${identifier}`)
    .digest('hex');
}

/** Identificador tal como lo escribió el usuario, sin mayúsculas ni espacios al borde. */
function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function loginPairKey(username: string, ip: string): string {
  return throttleKey('login-pair', `${normalizeIdentifier(username)}|${ip}`);
}

/** Espera exigida tras `failures` fallos seguidos: 0 hasta el umbral, luego 1, 2, 4… ≤ 60 s. */
export function loginDelaySeconds(failures: number): number {
  if (failures < LOGIN_FREE_FAILURES) return 0;
  return Math.min(LOGIN_MAX_DELAY_SECONDS, 2 ** (failures - LOGIN_FREE_FAILURES));
}

export type LoginThrottleDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterSeconds: number };

/** ¿Puede este par usuario|IP intentar ahora? Se consulta ANTES de argon2 (Inv-1). */
export async function checkLoginThrottle(
  username: string,
  ip: string
): Promise<LoginThrottleDecision> {
  const current = await ThrottleRepository.readCounter(
    loginPairKey(username, ip),
    LOGIN_WINDOW_SECONDS
  );
  if (!current) return { allowed: true };
  const wait = loginDelaySeconds(current.counter) - current.secondsSinceLast;
  return wait > 0 ? { allowed: false, retryAfterSeconds: wait } : { allowed: true };
}

/** Registra el resultado de las credenciales: un fallo suma al par; un acierto lo limpia. */
export async function recordLoginOutcome(
  username: string,
  ip: string,
  credentialsFailed: boolean
): Promise<void> {
  const key = loginPairKey(username, ip);
  if (credentialsFailed) {
    await ThrottleRepository.hitCounter(key, LOGIN_WINDOW_SECONDS);
  } else {
    await ThrottleRepository.clearCounter(key);
  }
}

/** Cuenta un envío al destinatario y dice si todavía cabe en la cuota de 24 h. */
export async function consumeMailQuota(recipient: string): Promise<boolean> {
  const sent = await ThrottleRepository.hitCounter(
    throttleKey('mail', normalizeIdentifier(recipient)),
    MAIL_WINDOW_SECONDS
  );
  return sent <= MAIL_QUOTA_PER_DAY;
}

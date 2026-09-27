import { createHmac } from 'node:crypto';
import * as ThrottleRepository from './authThrottle.repository';
import { botChallengeVerifier } from './botChallenge.service';
import type { BotChallengeVerdict } from './authSession.service';

/**
 * FC199 F2 — freno progresivo del login y tope de correos por destinatario (Cond.R-199 P3).
 *
 * Login: la llave es el PAR usuario|IP. Así un atacante no puede frenar a Ω desde otra IP (Ω
 * conserva su propio par) y nunca hay bloqueo permanente: tras `LOGIN_FREE_FAILURES` fallos
 * seguidos, cada intento espera 1, 2, 4… s desde el anterior, con techo de 60 s (`Retry-After`),
 * sin `sleep` en el handler. El ataque distribuido contra UNA cuenta lo cubre el reto PoW de F3:
 * desde el `LOGIN_CHALLENGE_AFTER`-ésimo fallo de la CUENTA (una sola llave por cuenta: usuario y
 * correo son la misma, 424_AN) o de la IP, el siguiente intento exige el reto (fail-closed).
 *
 * Correo: máximo `MAIL_QUOTA_PER_DAY` códigos al mismo destinatario en 24 h (setup y reenvío),
 * para que nadie use nuestro SMTP contra un buzón ajeno.
 */

export const LOGIN_WINDOW_SECONDS = 15 * 60;
export const LOGIN_FREE_FAILURES = 5;
export const LOGIN_CHALLENGE_AFTER = 3;
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

/** Referencia de la cuenta para el contador del reto: el id si existe (usuario y correo son UNA
 *  cuenta); si no, el identificador normalizado. La respuesta al cliente no cambia (anti-enumeración). */
export function loginAccountRef(accountId: number | null, identifier: string): string {
  return accountId === null ? `name:${normalizeIdentifier(identifier)}` : `id:${accountId}`;
}

function accountKey(accountRef: string): string {
  return throttleKey('login-account', accountRef);
}

function ipKey(ip: string): string {
  return throttleKey('login-ip', ip);
}

async function failuresIn(key: string): Promise<number> {
  const current = await ThrottleRepository.readCounter(key, LOGIN_WINDOW_SECONDS);
  return current?.counter ?? 0;
}

/** FAIL_GE3 del FC: la cuenta o la IP ya acumulan `LOGIN_CHALLENGE_AFTER` fallos en la ventana. */
export async function isLoginChallengeRequired(accountRef: string, ip: string): Promise<boolean> {
  const [account, byIp] = await Promise.all([
    failuresIn(accountKey(accountRef)),
    failuresIn(ipKey(ip)),
  ]);
  return account >= LOGIN_CHALLENGE_AFTER || byIp >= LOGIN_CHALLENGE_AFTER;
}

/** Veredicto del login adaptativo: sin sospecha no pide nada; con sospecha, reto ausente → REQUIRED
 *  y reto inválido o repetido → FAILED (fail-closed, Inv-3). `null` = puede seguir a argon2. */
export async function evaluateLoginChallenge(
  accountRef: string,
  ip: string,
  payload: string | undefined
): Promise<BotChallengeVerdict | null> {
  if (!(await isLoginChallengeRequired(accountRef, ip))) return null;
  if (!payload) return 'BOT_CHALLENGE_REQUIRED';
  return (await botChallengeVerifier.verify(payload)) ? null : 'BOT_CHALLENGE_FAILED';
}

/** Qué probó el intento: la contraseña falló, la contraseña fue correcta, o no se evaluó (p. ej.
 *  lo cortó el reto). Solo `passed` limpia contadores: cortar en el reto no puede borrar sospechas. */
export type CredentialOutcome = 'failed' | 'passed' | 'untested';

export interface LoginAttempt {
  username: string;
  ip: string;
  accountRef: string;
}

/** Registra el resultado: un fallo suma al par, a la cuenta y a la IP; un acierto limpia el par y
 *  la cuenta (la IP no: una cuenta válida no borra el rastreo de un barrido desde esa IP). */
export async function recordLoginOutcome(
  attempt: LoginAttempt,
  outcome: CredentialOutcome
): Promise<void> {
  const pair = loginPairKey(attempt.username, attempt.ip);
  const account = accountKey(attempt.accountRef);
  if (outcome === 'failed') {
    await Promise.all([
      ThrottleRepository.hitCounter(pair, LOGIN_WINDOW_SECONDS),
      ThrottleRepository.hitCounter(account, LOGIN_WINDOW_SECONDS),
      ThrottleRepository.hitCounter(ipKey(attempt.ip), LOGIN_WINDOW_SECONDS),
    ]);
  } else if (outcome === 'passed') {
    await Promise.all([
      ThrottleRepository.clearCounter(pair),
      ThrottleRepository.clearCounter(account),
    ]);
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

import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import consumeNonce from './botChallenge.repository';

/**
 * FC199 F3 — reto anti-bot de prueba de trabajo, propio y soberano (Inv-2: 0 terceros, 0 red externa).
 * Formato compatible con ALTCHA (`algorithm`, `challenge`, `maxnumber`, `salt`, `signature` → el
 * cliente responde `number`), implementado con `node:crypto`:
 *
 *   challenge = SHA-256(salt + número secreto)      firma = HMAC-SHA256(llave, challenge)
 *
 * El navegador prueba números hasta dar con el hash (≈ maxnumber/2 intentos). La sal lleva la
 * emisión y la caducidad (5 min); como la sal entra en el hash firmado, no se puede alterar. Cada
 * reto resuelto se consume UNA vez en `auth_challenge_nonces` (anti-replay).
 */

export const CHALLENGE_TTL_SECONDS = 5 * 60;
const DEFAULT_MAX_NUMBER = 20_000;

export interface BotChallenge {
  algorithm: 'SHA-256';
  challenge: string;
  maxnumber: number;
  salt: string;
  signature: string;
}

export interface VerifyOptions {
  /** Tiempo mínimo desde la emisión del reto (piso anti-envío instantáneo del signup). */
  minAgeMs?: number;
}

/** Contrato del verificador (IBotChallengeVerifier del FC): permite cambiar de motor sin tocar rutas. */
export interface BotChallengeVerifier {
  issue(): BotChallenge;
  verify(payload: string | undefined, options?: VerifyOptions): Promise<boolean>;
}

/** Dificultad: por entorno (`BOT_CHALLENGE_MAX_NUMBER`) o 20 000 (≈ 0,3–0,5 s en V8). */
function maxNumber(): number {
  const configured = Number(process.env.BOT_CHALLENGE_MAX_NUMBER);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_MAX_NUMBER;
}

/** Llave HMAC propia, derivada de la de los JWT con prefijo de dominio (no sirve para firmar tokens). */
function signingKey(): Buffer {
  return createHmac('sha256', process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-prod')
    .update('archon-bot-challenge-v1')
    .digest();
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sign(challenge: string): string {
  return createHmac('sha256', signingKey()).update(challenge).digest('hex');
}

/** Reto nuevo: sal aleatoria con emisión (ms) y caducidad (s) + número secreto. */
function issue(): BotChallenge {
  const now = Date.now();
  const expires = Math.floor(now / 1000) + CHALLENGE_TTL_SECONDS;
  const salt = `${randomBytes(12).toString('hex')}?expires=${expires}&issued=${now}`;
  const max = maxNumber();
  const challenge = sha256Hex(`${salt}${randomInt(0, max + 1)}`);
  return { algorithm: 'SHA-256', challenge, maxnumber: max, salt, signature: sign(challenge) };
}

const HEX_64 = /^[0-9a-f]{64}$/;
const solutionSchema = z.object({
  algorithm: z.literal('SHA-256'),
  challenge: z.string().regex(HEX_64),
  number: z.number().int().nonnegative(),
  salt: z.string().min(1).max(200),
  signature: z.string().regex(HEX_64),
});
type Solution = z.infer<typeof solutionSchema>;

/** `payload` en base64 (JSON) → solución con forma válida, o `null`. */
function decodeSolution(payload: string): Solution | null {
  try {
    const parsed = solutionSchema.safeParse(
      JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Emisión (ms) y caducidad (s) que viajan en la sal; `null` si faltan. */
function saltTimes(salt: string): { issuedMs: number; expiresS: number } | null {
  const params = new URLSearchParams(salt.split('?')[1] ?? '');
  const issuedMs = Number(params.get('issued'));
  const expiresS = Number(params.get('expires'));
  if (!Number.isInteger(issuedMs) || !Number.isInteger(expiresS)) return null;
  return { issuedMs, expiresS };
}

function sameHex(a: string, b: string): boolean {
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/** Firma y trabajo correctos, vigente y con el tiempo mínimo cumplido (sin tocar la DB). */
function isValidSolution(solution: Solution, minAgeMs: number, nowMs: number): boolean {
  const times = saltTimes(solution.salt);
  if (!times || times.expiresS * 1000 <= nowMs || nowMs - times.issuedMs < minAgeMs) return false;
  if (!sameHex(sign(solution.challenge), solution.signature)) return false;
  return sameHex(sha256Hex(`${solution.salt}${solution.number}`), solution.challenge);
}

/** Fail-closed (Inv-3): ausente, malformado, vencido, falso o repetido → `false`. */
async function verify(payload: string | undefined, options: VerifyOptions = {}): Promise<boolean> {
  if (!payload) return false;
  const solution = decodeSolution(payload);
  if (!solution || !isValidSolution(solution, options.minAgeMs ?? 0, Date.now())) return false;
  const times = saltTimes(solution.salt);
  return consumeNonce(solution.challenge, times?.expiresS ?? 0);
}

export const botChallengeVerifier: BotChallengeVerifier = { issue, verify };

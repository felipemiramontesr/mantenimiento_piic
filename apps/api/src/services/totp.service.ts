import crypto from 'node:crypto';

/**
 * FC185 F1 — Sovereign_MFA_TOTP_Two_Step_Authentication. Motor RFC 6238 (TOTP) / RFC 4226 (HOTP)
 * 100% nativo en `node:crypto` — invariante 1 del FC (Zero Dependency), 0 librería npm de TOTP.
 * Módulo puro: sin acceso a DB, sin conocimiento de `users`/sesiones — eso vive en
 * `mfa.repository.ts`/`mfa.service.ts`. Base32 (RFC 4648) también se implementa aquí porque
 * Node no lo trae de fábrica y es lo que las apps autenticadoras (Google/Microsoft Authenticator,
 * Authy) esperan tanto en el secreto mostrado como en la URI `otpauth://`.
 *
 * `no-bitwise` se desactiva puntualmente en el empaquetado Base32 y el truncamiento dinámico de
 * RFC 4226 §5.3 — son operaciones de manipulación de bits mandatadas por el estándar, no un atajo
 * evitable; el resto del archivo respeta la regla del proyecto sin excepción.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const TOTP_STEP_SECONDS = 30;
/** ±1 paso de 30s = ventana de deriva de 90s totales (FC185 SCOPE F1). */
export const TOTP_WINDOW_STEPS = 1;
export const TOTP_DIGITS = 6;
/** 160 bits — recomendación mínima de RFC 4226 §4 R6 para el secreto compartido. */
export const TOTP_SECRET_BYTES = 20;

/** RFC 4648 Base32, sin padding — usado tanto para el secreto en texto plano (ingreso manual)
 *  como para el parámetro `secret` de la URI `otpauth://`. */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  buffer.forEach((byte) => {
    /* eslint-disable no-bitwise -- empaquetado de bits RFC 4648, no un atajo evitable */
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    /* eslint-enable no-bitwise */
  });
  if (bits > 0) {
    // eslint-disable-next-line no-bitwise -- idem, relleno del último grupo parcial de 5 bits
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Inverso de `base32Encode` — tolera minúsculas y separadores (espacios/guiones) que un usuario
 *  podría teclear al capturar el secreto manualmente; ignora cualquier carácter fuera del alfabeto. */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  Array.from(clean).forEach((char) => {
    // `clean` ya pasó por el filtro `[^A-Z2-7]` de arriba, así que todo carácter que llega aquí
    // está garantizado en `BASE32_ALPHABET` -- `indexOf` nunca puede regresar -1 (no hay guard
    // muerto que cubrir con un test que finja lo imposible).
    const idx = BASE32_ALPHABET.indexOf(char);
    /* eslint-disable no-bitwise -- desempaquetado de bits RFC 4648, no un atajo evitable */
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
    /* eslint-enable no-bitwise */
  });
  return Buffer.from(bytes);
}

/** Secreto TOTP aleatorio (160 bits), listo para cifrarse (`EncryptionService`, invariante 2) y
 *  para mostrarse una sola vez al usuario durante el enrolamiento. */
export function generateTotpSecret(byteLength: number = TOTP_SECRET_BYTES): string {
  return base32Encode(crypto.randomBytes(byteLength));
}

/** URI canónica `otpauth://totp/...` — lo que una app autenticadora lee al escanear el QR de
 *  enrolamiento (FC185 F3). */
export function buildTotpUri(
  secretBase32: string,
  accountLabel: string,
  issuer = 'Archon'
): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Contador RFC 6238 al instante dado — steps caben holgado en 32 bits sin signo hasta ~2106
 *  (2^32 steps × 30s), ver `computeTotpCode`. */
export function currentTotpStep(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
}

/** HOTP (RFC 4226) para un contador/step específico: HMAC-SHA1 + truncamiento dinámico. */
export function computeTotpCode(secretBase32: string, step: number): string {
  const key = base32Decode(secretBase32);
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(0, 0);
  // eslint-disable-next-line no-bitwise -- step siempre no-negativo aquí; >>>0 solo normaliza a uint32
  counter.writeUInt32BE(step >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  /* eslint-disable no-bitwise -- truncamiento dinámico RFC 4226 §5.3, mandatado por el estándar */
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  /* eslint-enable no-bitwise */
  return (binCode % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
}

export interface TotpVerifyResult {
  valid: boolean;
  matchedStep: number | null;
}

/** Verifica un código de 6 dígitos contra la ventana de deriva ±1 paso (90s, FC185 SCOPE F1).
 *  R6 (340_AN, Bravo) — anti-replay: un `lastUsedStep` no nulo descarta cualquier step <= ese
 *  valor, cerrando la ventana en la que el mismo código válido podría reusarse dentro de los
 *  mismos 90s. Comparación en tiempo constante (`timingSafeEqual`) — defensa en profundidad
 *  contra timing attacks sobre el código de 6 dígitos (A1 dominio del FC). */
export function verifyTotpCode(
  secretBase32: string,
  code: string,
  options: { nowMs?: number; lastUsedStep?: number | null } = {}
): TotpVerifyResult {
  if (!/^\d{6}$/.test(code)) return { valid: false, matchedStep: null };
  const codeBuffer = Buffer.from(code, 'utf8');
  const nowStep = currentTotpStep(options.nowMs);
  const candidateSteps = Array.from(
    { length: TOTP_WINDOW_STEPS * 2 + 1 },
    (_, i) => nowStep - TOTP_WINDOW_STEPS + i
  );
  const matchedStep = candidateSteps.find((step) => {
    if (options.lastUsedStep != null && step <= options.lastUsedStep) return false;
    const expectedBuffer = Buffer.from(computeTotpCode(secretBase32, step), 'utf8');
    return crypto.timingSafeEqual(expectedBuffer, codeBuffer);
  });
  return matchedStep !== undefined
    ? { valid: true, matchedStep }
    : { valid: false, matchedStep: null };
}

/** Alfabeto sin 0/O/1/I/L — ambiguos al transcribir un código de respaldo a mano. */
const BACKUP_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const BACKUP_CODE_COUNT = 8;
const BACKUP_CODE_LENGTH = 10;

function randomBackupCode(): string {
  const bytes = crypto.randomBytes(BACKUP_CODE_LENGTH);
  let raw = '';
  for (let i = 0; i < BACKUP_CODE_LENGTH; i += 1) {
    raw += BACKUP_CODE_ALPHABET[bytes[i] % BACKUP_CODE_ALPHABET.length];
  }
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

/** 8 códigos de respaldo de un solo uso, texto plano (invariante 3 del FC) — el caller los
 *  muestra UNA vez y persiste solo su hash Argon2id (R7, 340_AN); nunca se recalculan ni se
 *  vuelven a mostrar. */
export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(randomBackupCode());
  }
  return [...codes];
}

import { z } from 'zod';

/**
 * FC187 F1 — configuración del motor de correo, 100% desde el entorno (panel de variables de
 * Hostinger). `loadMailConfig` es PURA: recibe el objeto de entorno en vez de leer `process.env`,
 * así se prueba sin tocar el proceso y nunca abre sockets. Ningún valor secreto sale de aquí en
 * mensajes de error: las razones de `disabled` nombran variables, jamás su contenido.
 */

/** Entorno de solo lectura (`process.env` es asignable). */
export type MailEnv = Readonly<Record<string, string | undefined>>;

/** SMTP completo y válido. `secure=true` ⇒ TLS implícito (465); `false` ⇒ STARTTLS obligatorio. */
export interface SmtpMailConfig {
  readonly mode: 'smtp';
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user: string;
  readonly pass: string;
  readonly fromName: string;
  readonly fromAddress: string;
  readonly replyTo?: string;
}

/** Solo en tests (`NODE_ENV=test` o `VITEST=true`): cola en memoria, 0 sockets. */
export interface MemoryMailConfig {
  readonly mode: 'memory';
}

/** Cualquier otro caso: sin SMTP usable. `reason` nombra la variable, nunca su valor. */
export interface DisabledMailConfig {
  readonly mode: 'disabled';
  readonly reason: string;
}

/** Resultado de `loadMailConfig` — regla D1b de FC187. */
export type MailConfig = SmtpMailConfig | MemoryMailConfig | DisabledMailConfig;

const DEFAULT_FROM_NAME = 'Archon ERP';
const IMPLICIT_TLS_PORT = 465;
const MAX_TCP_PORT = 65535;
const emailSchema = z.string().email();

interface RawSmtpValues {
  readonly host: string;
  readonly portRaw: string;
  readonly user: string;
  readonly pass: string;
  readonly fromName: string;
  readonly replyTo: string;
}

function clean(value: string | undefined): string {
  return (value ?? '').trim();
}

function readSmtpValues(env: MailEnv): RawSmtpValues {
  return {
    host: clean(env.SMTP_HOST),
    portRaw: clean(env.SMTP_PORT),
    user: clean(env.SMTP_USER),
    // La contraseña se conserva tal cual (un espacio al borde puede ser intencional); solo se
    // comprueba que exista.
    pass: env.SMTP_PASS ?? '',
    fromName: clean(env.SMTP_FROM_NAME),
    replyTo: clean(env.SMTP_REPLY_TO),
  };
}

function isValidPort(portRaw: string): boolean {
  const port = Number(portRaw);
  return Number.isInteger(port) && port >= 1 && port <= MAX_TCP_PORT;
}

function isEmail(value: string): boolean {
  return emailSchema.safeParse(value).success;
}

/** Primer problema de la configuración SMTP (solo nombres de variable) o `null` si es usable. */
function findSmtpProblem(raw: RawSmtpValues): string | null {
  const missing = [
    ['SMTP_HOST', raw.host],
    ['SMTP_PORT', raw.portRaw],
    ['SMTP_USER', raw.user],
    ['SMTP_PASS', raw.pass.trim()],
  ]
    .filter(([, value]) => value === '')
    .map(([name]) => name);
  if (missing.length > 0) return `faltan variables ${missing.join(', ')}`;
  if (!isValidPort(raw.portRaw)) return 'SMTP_PORT no es un puerto válido (1-65535)';
  if (!isEmail(raw.user)) return 'SMTP_USER no es una dirección de correo válida';
  if (raw.replyTo !== '' && !isEmail(raw.replyTo)) {
    return 'SMTP_REPLY_TO no es una dirección de correo válida';
  }
  return null;
}

/**
 * Regla D1b (FC187 v2.1): en test ⇒ `memory` (PRIMERO, para que un `.env` local con credenciales
 * jamás abra sockets durante `vitest`, R10); SMTP completo y válido ⇒ `smtp`; cualquier otro caso
 * ⇒ `disabled`. La selección depende de la PRESENCIA de `SMTP_*`, no de `NODE_ENV==='production'`.
 * El remitente (`From`) es `SMTP_USER`: la dirección vive solo en el entorno, no en el código.
 */
export function loadMailConfig(env: MailEnv): MailConfig {
  if (env.NODE_ENV === 'test' || env.VITEST === 'true') return { mode: 'memory' };

  const raw = readSmtpValues(env);
  const problem = findSmtpProblem(raw);
  if (problem !== null) return { mode: 'disabled', reason: problem };

  const port = Number(raw.portRaw);
  return {
    mode: 'smtp',
    host: raw.host,
    port,
    secure: port === IMPLICIT_TLS_PORT,
    user: raw.user,
    pass: raw.pass,
    fromName: raw.fromName || DEFAULT_FROM_NAME,
    fromAddress: raw.user,
    ...(raw.replyTo === '' ? {} : { replyTo: raw.replyTo }),
  };
}

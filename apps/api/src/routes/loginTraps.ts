import { FastifyRequest } from 'fastify';
import { reportSecurityEvent } from '../services/securityEvents.service';

/**
 * FC201 F2 — trampas del login, solo en modo detección: registran en segundo plano y NUNCA cambian la
 * respuesta, el flujo ni los tiempos del login (Cond.R-201 P6: 0 `sleep`, 0 usuarios en la DB).
 */

/** HP2 — cuentas señuelo: nombres que prueba un diccionario de ataque y que ninguna cuenta usa. */
export const TRAP_ACCOUNTS: ReadonlySet<string> = new Set([
  'admin',
  'root',
  'administrator',
  'superuser',
  'soporte',
  'test',
]);

/** HP3 — nombre neutro del campo trampa, el mismo del signup (B2). */
export const TRAP_FIELD = 'website_url';

function logRecordFailure(request: FastifyRequest): (err: unknown) => void {
  return (err) => request.log.warn({ err }, 'security-event-record-failed');
}

/** HP2 — registra el intento solo si el nombre es señuelo Y la cuenta no existe: si algún día se
 *  crea una cuenta real con ese nombre, su login jamás cuenta como ataque. */
export function reportTrapAccount(
  request: FastifyRequest,
  username: string,
  accountFound: boolean
): void {
  const candidate = username.trim().toLowerCase();
  if (accountFound || !TRAP_ACCOUNTS.has(candidate)) return;
  reportSecurityEvent(
    {
      type: 'TRAP_ACCOUNT',
      ip: request.ip,
      targetPattern: 'login:trap-account',
      sample: candidate,
    },
    logRecordFailure(request)
  );
}

/** HP3 — el campo oculto llegó con contenido. Detección pasiva (B2): el login sigue igual aunque la
 *  contraseña sea correcta (un autocompletado no debe dejar fuera a nadie). No guarda lo escrito. */
export function reportTrapField(request: FastifyRequest, value: unknown): void {
  if (typeof value !== 'string' || value.trim() === '') return;
  reportSecurityEvent(
    { type: 'TRAP_FIELD', ip: request.ip, targetPattern: `login:${TRAP_FIELD}` },
    logRecordFailure(request)
  );
}

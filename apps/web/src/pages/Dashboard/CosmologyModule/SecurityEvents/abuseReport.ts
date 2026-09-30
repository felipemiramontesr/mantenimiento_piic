import type { SecurityEvent, SecurityEventType } from './securityEventsApi';

/**
 * FC201 F3 (P4) — reporte de abuso listo para `abuse@<proveedor>` de la IP atacante. En inglés, el
 * idioma que atienden los equipos de abuso; todas las fechas en UTC. Solo describe lo observado:
 * cero datos internos del sistema (Inv-5).
 */

const VECTOR: Record<SecurityEventType, string> = {
  BAIT_ROUTE: 'Automated vulnerability scanning of non-existent administrative paths',
  TRAP_ACCOUNT: 'Credential-guessing login attempts against default administrator usernames',
  TRAP_FIELD: 'Automated login form submission by a bot (hidden field filled)',
};

/** Etiqueta es-MX de cada tipo de trampa, para la tabla de Ω. */
export const EVENT_TYPE_LABEL: Record<SecurityEventType, string> = {
  BAIT_ROUTE: 'Ruta carnada',
  TRAP_ACCOUNT: 'Cuenta señuelo',
  TRAP_FIELD: 'Campo trampa',
};

/** Texto del reporte para una IP en claro (sin ella —seudonimizada— no hay a quién reportar). */
export function buildAbuseReport(
  event: SecurityEvent,
  ipAddress: string,
  targetHost: string
): string {
  return [
    'Abuse report: unauthorized access attempts',
    '',
    `Source IP: ${ipAddress}`,
    `Target host: ${targetHost}`,
    `Attack vector: ${VECTOR[event.eventType]} (${event.targetPattern})`,
    `Requests observed: ${event.hits}`,
    `First seen (UTC): ${event.firstSeenUtc}`,
    `Last seen (UTC): ${event.lastSeenUtc}`,
    '',
    'All timestamps are UTC. Please investigate and stop this activity from your network.',
  ].join('\n');
}

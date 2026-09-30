import { createHmac } from 'node:crypto';
import * as SecurityEventsRepository from './securityEvents.repository';

/**
 * FC201 — eventos de seguridad de la capa de carnadas: registro agregado (F2) y ciclo de vida (F1).
 *
 * Solo DETECTA (Cond.R-201 P1–P2): registrar no bloquea, no cambia la respuesta y no abre ninguna
 * conexión hacia quien tocó la carnada. La IP se guarda en HMAC (seudónimo estable para agregar y,
 * en F3, para la lista de bloqueo manual) y en claro solo 15 días para que Ω la vea o la reporte.
 */

export type SecurityEventType = 'BAIT_ROUTE' | 'TRAP_ACCOUNT' | 'TRAP_FIELD';

export interface SecurityEventInput {
  readonly type: SecurityEventType;
  readonly ip: string;
  /** Entrada del catálogo de carnadas (`BAIT_ROUTES`, con su comodín), NO la ruta pedida (Inv-2). */
  readonly targetPattern: string;
  /** Última muestra concreta vista; se trunca y queda fuera de la llave. */
  readonly sample?: string;
}

const MAX_SAMPLE_LENGTH = 255;
const MAX_IP_LENGTH = 45;

/** HMAC-SHA256 de la IP con la clave de los JWT y un prefijo de dominio propio (no reutilizable). */
export function hashSecurityIp(ip: string): string {
  return createHmac('sha256', process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-prod')
    .update(`security-event-ip|${ip}`)
    .digest('hex');
}

/** Registra (agregado por hora) `hits` toques a una carnada. */
export async function recordSecurityEvent(input: SecurityEventInput, hits = 1): Promise<void> {
  await SecurityEventsRepository.upsertSecurityEvent({
    eventType: input.type,
    ipHash: hashSecurityIp(input.ip),
    ipAddress: input.ip.slice(0, MAX_IP_LENGTH),
    targetPattern: input.targetPattern,
    samplePath: input.sample ? input.sample.slice(0, MAX_SAMPLE_LENGTH) : null,
    hits,
  });
}

/** Toques que llegaron mientras la escritura de su llave seguía en curso. */
interface PendingHits {
  count: number;
  latest: SecurityEventInput;
}

// Coalescencia por llave de agregación: a lo sumo UNA escritura en curso por (tipo, ip, carnada). Las
// carnadas no llevan rate limit (sus cabeceras deben ser las del 404 genérico, Inv-1), así que una
// ráfaga se suma en memoria y se escribe de una vez: conteo exacto sin una consulta por toque.
const inFlight = new Map<string, PendingHits>();

function aggregationKey(input: SecurityEventInput): string {
  return `${input.type}|${input.ip}|${input.targetPattern}`;
}

function writeCoalesced(
  key: string,
  input: SecurityEventInput,
  hits: number,
  onError: (err: unknown) => void
): void {
  recordSecurityEvent(input, hits)
    .catch(onError)
    .finally(() => {
      const pending = inFlight.get(key);
      if (pending && pending.count > 0) {
        const { count, latest } = pending;
        inFlight.set(key, { count: 0, latest });
        writeCoalesced(key, latest, count, onError);
      } else {
        inFlight.delete(key);
      }
    });
}

/** Registro en segundo plano, después de responder: la carnada no suma latencia ni cambia la
 *  respuesta, y un fallo de la DB solo se reporta a `onError` (nunca llega al cliente). */
export function reportSecurityEvent(
  input: SecurityEventInput,
  onError: (err: unknown) => void
): void {
  const key = aggregationKey(input);
  const pending = inFlight.get(key);
  if (pending) {
    pending.count += 1;
    pending.latest = input;
    return;
  }
  inFlight.set(key, { count: 0, latest: input });
  setImmediate(() => writeCoalesced(key, input, 1, onError));
}

export interface SecurityEventsLifecycleReport {
  readonly clearedIps: number;
  readonly purgedEvents: number;
  readonly purgedDenylist: number;
}

/** Tarea del programador por tráfico: IP en claro → NULL a los 15 días, evento fuera a los 90 y
 *  bloqueos vencidos o revocados fuera a los 30 (Inv-4). */
export async function runSecurityEventsLifecycle(): Promise<SecurityEventsLifecycleReport> {
  const clearedIps = await SecurityEventsRepository.clearExpiredClearIps();
  const purgedEvents = await SecurityEventsRepository.deleteOldSecurityEvents();
  const purgedDenylist = await SecurityEventsRepository.deleteStaleDenylistEntries();
  return { clearedIps, purgedEvents, purgedDenylist };
}

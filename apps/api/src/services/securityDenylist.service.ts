import * as SecurityEventsRepository from './securityEvents.repository';
import { hashSecurityIp } from './securityEvents.service';

/**
 * FC201 F3 — bloqueo perimetral manual de Ω (P4, T1.3). El guard `onRequest` consulta SOLO esta
 * lista en memoria: ninguna petición paga una consulta a la DB. La recarga el programador por
 * tráfico (cada minuto) y, al instante, cada alta o revocación. Si la DB falla se conserva la
 * última lista buena. Nunca hay bloqueo automático (Inv-3): solo entra lo que Ω agrega.
 */

/** ip_hash → instante (ms, reloj del proceso) en que vence el bloqueo. */
let activeBlocks = new Map<string, number>();

/** ¿La IP tiene un bloqueo manual vigente? Sin DB: solo la lista en memoria. */
export function isIpDenied(ip: string, now: number = Date.now()): boolean {
  if (activeBlocks.size === 0) return false;
  const expiresAt = activeBlocks.get(hashSecurityIp(ip));
  return expiresAt !== undefined && expiresAt > now;
}

/** Recarga la lista desde la DB (tarea del programador y tras cada cambio de Ω). */
export async function refreshDenylistCache(now: number = Date.now()): Promise<number> {
  const rows = await SecurityEventsRepository.listActiveDenylist();
  activeBlocks = new Map(rows.map((row) => [row.ip_hash, now + Number(row.ttl_seconds) * 1000]));
  return activeBlocks.size;
}

export interface DenyIpCommand {
  readonly ip: string;
  readonly hours: number;
  readonly reason: string | null;
  readonly createdBy: number;
}

/** Ω bloquea una IP por `hours` horas; la lista en memoria se recarga en el acto. */
export async function denyIp(command: DenyIpCommand): Promise<string> {
  const ipHash = hashSecurityIp(command.ip);
  await SecurityEventsRepository.upsertDenylistEntry({
    ipHash,
    ipAddress: command.ip,
    reason: command.reason,
    hours: command.hours,
    createdBy: command.createdBy,
  });
  await refreshDenylistCache();
  return ipHash;
}

/** Ω revoca un bloqueo; `false` si no había uno vigente con ese hash. */
export async function revokeIpDenial(ipHash: string): Promise<boolean> {
  const revoked = await SecurityEventsRepository.revokeDenylistEntry(ipHash);
  await refreshDenylistCache();
  return revoked;
}

export interface SecurityConsole {
  readonly events: SecurityEventsRepository.SecurityEventSummary[];
  readonly blocks: SecurityEventsRepository.DenylistEntry[];
}

/** Consola de Ω: eventos de los últimos 15 días y bloqueos vigentes. */
export async function getSecurityConsole(): Promise<SecurityConsole> {
  const [events, blocks] = await Promise.all([
    SecurityEventsRepository.listRecentSecurityEvents(),
    SecurityEventsRepository.listActiveDenylist(),
  ]);
  return { events, blocks };
}

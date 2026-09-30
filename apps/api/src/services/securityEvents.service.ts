import * as SecurityEventsRepository from './securityEvents.repository';

/**
 * FC201 F1 — ciclo de vida de los eventos de seguridad (la escritura de eventos llega en F2 junto con
 * las carnadas, su primer consumidor). La IP en claro vive 15 días; después queda solo el HMAC.
 */

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

import api from '../../../../api/client';

/**
 * FC201 F3 — contrato de `/v1/cosmology/security-events` (Ω-exclusivo). Fechas en UTC para el
 * reporte de abuso; `ipAddress` es `null` cuando la IP ya se seudonimizó (> 15 días, P3).
 */

export type SecurityEventType = 'BAIT_ROUTE' | 'TRAP_ACCOUNT' | 'TRAP_FIELD';

export interface SecurityEvent {
  readonly eventType: SecurityEventType;
  readonly ipHash: string;
  readonly ipAddress: string | null;
  readonly targetPattern: string;
  readonly hits: number;
  readonly firstSeenUtc: string;
  readonly lastSeenUtc: string;
}

export interface ManualBlock {
  readonly ipHash: string;
  readonly ipAddress: string | null;
  readonly reason: string | null;
  readonly expiresUtc: string;
}

export interface SecurityEventsData {
  readonly events: SecurityEvent[];
  readonly blocks: ManualBlock[];
}

/** Eventos de los últimos 15 días y bloqueos vigentes; una respuesta sin listas cae a vacías. */
export async function fetchSecurityEvents(): Promise<SecurityEventsData> {
  const res = await api.get<{ success: boolean; data?: Partial<SecurityEventsData> | null }>(
    '/cosmology/security-events'
  );
  const data = res.data?.data;
  return {
    events: Array.isArray(data?.events) ? data.events : [],
    blocks: Array.isArray(data?.blocks) ? data.blocks : [],
  };
}

/** Bloqueo perimetral manual de Ω (1 h a 30 días). */
export async function denyIp(ip: string, hours: number, reason: string): Promise<void> {
  await api.post('/cosmology/security-events/deny-ip', {
    ip,
    hours,
    ...(reason.trim() ? { reason: reason.trim() } : {}),
  });
}

/** Revoca un bloqueo vigente. */
export async function revokeBlock(ipHash: string): Promise<void> {
  await api.delete(`/cosmology/security-events/deny-ip/${ipHash}`);
}

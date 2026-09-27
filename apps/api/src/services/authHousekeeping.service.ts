import * as HousekeepingRepository from './authHousekeeping.repository';
import { recordAuditLog } from './auditService';

/**
 * FC199 F4 — barrido periódico de higiene de autenticación (lo dispara el tráfico, máx. 1/h, vía
 * `plugins/housekeepingTrigger.ts`; en Hostinger el proceso se duerme y un cron no corre):
 * purga cuentas públicas sin 2FA con más de 48 h (una por una y auditada), retos PoW vencidos y
 * contadores de throttling inactivos. Nunca toca cuentas creadas por Ω (`signup_source = 'admin'`).
 */

export interface HousekeepingReport {
  readonly purgedAccounts: number;
  readonly expiredNonces: number;
  readonly staleCounters: number;
}

/** Borra UNA candidata (re-verificada en el DELETE) y, si se borró, deja su entrada de auditoría. */
async function purgeAccount(userId: number): Promise<boolean> {
  if (!(await HousekeepingRepository.deletePurgeableAccount(userId))) return false;
  await recordAuditLog({
    entity_type: 'user',
    entity_id: String(userId),
    action: 'DELETE',
    reason:
      'FC199 F4 — registro público sin 2FA confirmado ni membresía tras 48 h (purga automática)',
    user_id: null,
  });
  return true;
}

/** Purga las candidatas UNA POR UNA (en secuencia) y responde cuántas se borraron. */
async function purgeUnverifiedPublicAccounts(): Promise<number> {
  const candidates = await HousekeepingRepository.findPurgeableAccountIds();
  const outcomes = await candidates.reduce<Promise<boolean[]>>(
    async (done, userId) => [...(await done), await purgeAccount(userId)],
    Promise.resolve([])
  );
  return outcomes.filter(Boolean).length;
}

/** Corre las tres limpiezas y responde cuántas filas quitó cada una. */
export async function runAuthHousekeeping(): Promise<HousekeepingReport> {
  const purgedAccounts = await purgeUnverifiedPublicAccounts();
  const expiredNonces = await HousekeepingRepository.deleteExpiredNonces();
  const staleCounters = await HousekeepingRepository.deleteStaleCounters();
  return { purgedAccounts, expiredNonces, staleCounters };
}

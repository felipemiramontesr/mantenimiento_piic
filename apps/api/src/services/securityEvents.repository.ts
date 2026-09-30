import { ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC201 F1 — frontera SQL del ciclo de vida de `security_events` y `security_manual_denylist`
 * (migración 181): todo parametrizado y con el reloj de la DB. La escritura de eventos llega en F2.
 * La IP en claro solo vive 15 días para que Ω la vea; después queda el HMAC (Cond.R-201 P3).
 */

/** P3 · Inv-4: a los 15 días la IP en claro se vacía en ambas tablas; queda el HMAC. */
export async function clearExpiredClearIps(): Promise<number> {
  const [events] = await db.execute<ResultSetHeader>(
    `UPDATE security_events SET ip_address = NULL
      WHERE ip_address IS NOT NULL AND created_at < NOW() - INTERVAL 15 DAY`
  );
  const [denylist] = await db.execute<ResultSetHeader>(
    `UPDATE security_manual_denylist SET ip_address = NULL
      WHERE ip_address IS NOT NULL AND created_at < NOW() - INTERVAL 15 DAY`
  );
  return events.affectedRows + denylist.affectedRows;
}

/** Inv-4: a los 90 días el evento se borra por completo. */
export async function deleteOldSecurityEvents(): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM security_events WHERE created_at < NOW() - INTERVAL 90 DAY'
  );
  return result.affectedRows;
}

/** Bloqueos manuales vencidos o revocados hace más de 30 días: ya no protegen nada. */
export async function deleteStaleDenylistEntries(): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `DELETE FROM security_manual_denylist
      WHERE COALESCE(revoked_at, expires_at) < NOW() - INTERVAL 30 DAY`
  );
  return result.affectedRows;
}

import { ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC201 F1 — frontera SQL del ciclo de vida de `security_events` y `security_manual_denylist`
 * (migración 181): todo parametrizado y con el reloj de la DB. F2 añade la escritura agregada. La IP
 * llega ya en HMAC (`ipHash`) y, aparte, en claro solo para que Ω la vea 15 días (Cond.R-201 P3).
 */

export interface SecurityEventRow {
  eventType: string;
  ipHash: string;
  ipAddress: string;
  targetPattern: string;
  samplePath: string | null;
  /** Toques acumulados en esta escritura (≥ 1; más de 1 cuando el servicio coalesce una ráfaga). */
  hits: number;
}

/** FC201 F2 — suma `hits` toques al evento de (tipo, ip_hash, hora, carnada). Una fila por hora, no
 *  por toque (Inv-2): la hora sale de la DB y `sample_path` guarda la última muestra, fuera de la llave. */
export async function upsertSecurityEvent(event: SecurityEventRow): Promise<void> {
  await db.execute<ResultSetHeader>(
    `INSERT INTO security_events
       (event_type, ip_hash, ip_address, target_pattern, sample_path, hit_count,
        window_hour, first_seen_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00'), NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       hit_count = hit_count + ?,
       last_seen_at = NOW(),
       sample_path = VALUES(sample_path)`,
    [
      event.eventType,
      event.ipHash,
      event.ipAddress,
      event.targetPattern,
      event.samplePath,
      event.hits,
      event.hits,
    ]
  );
}

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

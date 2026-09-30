import { ResultSetHeader, RowDataPacket } from 'mysql2';
import db, { MEXICO_TZ_OFFSET } from './db';

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

/** FC201 F3 — evento agregado de los últimos 15 días por (tipo, ip, carnada), con fechas en UTC. */
export interface SecurityEventSummary extends RowDataPacket {
  event_type: string;
  ip_hash: string;
  ip_address: string | null;
  target_pattern: string;
  hits: number | string;
  first_seen_utc: string;
  last_seen_utc: string;
}

/** Ventana visible para Ω (P3): la IP en claro solo existe esos 15 días. Las fechas pasan del huso
 *  de la sesión de la DB a UTC para el reporte de abuso. */
export async function listRecentSecurityEvents(): Promise<SecurityEventSummary[]> {
  const [rows] = await db.execute<SecurityEventSummary[]>(
    `SELECT event_type, ip_hash, MAX(ip_address) AS ip_address, target_pattern,
            SUM(hit_count) AS hits,
            DATE_FORMAT(CONVERT_TZ(MIN(first_seen_at), ?, '+00:00'), '%Y-%m-%dT%H:%i:%sZ') AS first_seen_utc,
            DATE_FORMAT(CONVERT_TZ(MAX(last_seen_at), ?, '+00:00'), '%Y-%m-%dT%H:%i:%sZ') AS last_seen_utc
       FROM security_events
      WHERE created_at >= NOW() - INTERVAL 15 DAY
      GROUP BY event_type, ip_hash, target_pattern
      ORDER BY MAX(last_seen_at) DESC
      LIMIT 200`,
    [MEXICO_TZ_OFFSET, MEXICO_TZ_OFFSET]
  );
  return rows;
}

/** FC201 F3 — bloqueo manual vigente (no revocado ni vencido). */
export interface DenylistEntry extends RowDataPacket {
  ip_hash: string;
  ip_address: string | null;
  reason: string | null;
  expires_utc: string;
  ttl_seconds: number | string;
}

/** Bloqueos vigentes con sus segundos restantes medidos con el reloj de la DB. */
export async function listActiveDenylist(): Promise<DenylistEntry[]> {
  const [rows] = await db.execute<DenylistEntry[]>(
    `SELECT ip_hash, ip_address, reason,
            DATE_FORMAT(CONVERT_TZ(expires_at, ?, '+00:00'), '%Y-%m-%dT%H:%i:%sZ') AS expires_utc,
            TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS ttl_seconds
       FROM security_manual_denylist
      WHERE revoked_at IS NULL AND expires_at > NOW()
      ORDER BY expires_at ASC`,
    [MEXICO_TZ_OFFSET]
  );
  return rows;
}

export interface DenylistInsert {
  ipHash: string;
  ipAddress: string;
  reason: string | null;
  hours: number;
  createdBy: number;
}

/** Bloquea (o re-bloquea) una IP por `hours` horas. Un re-bloqueo reinicia la ventana de 15 días de
 *  la IP en claro y anula una revocación previa. */
export async function upsertDenylistEntry(entry: DenylistInsert): Promise<void> {
  await db.execute<ResultSetHeader>(
    `INSERT INTO security_manual_denylist (ip_hash, ip_address, reason, expires_at, created_by)
     VALUES (?, ?, ?, NOW() + INTERVAL ? HOUR, ?)
     ON DUPLICATE KEY UPDATE
       ip_address = VALUES(ip_address),
       reason = VALUES(reason),
       expires_at = VALUES(expires_at),
       created_by = VALUES(created_by),
       revoked_at = NULL,
       created_at = CURRENT_TIMESTAMP`,
    [entry.ipHash, entry.ipAddress, entry.reason, entry.hours, entry.createdBy]
  );
}

/** Revoca un bloqueo vigente; `false` si no había uno activo con ese hash. */
export async function revokeDenylistEntry(ipHash: string): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE security_manual_denylist SET revoked_at = NOW()
      WHERE ip_hash = ? AND revoked_at IS NULL`,
    [ipHash]
  );
  return result.affectedRows > 0;
}

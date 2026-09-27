import { ResultSetHeader, RowDataPacket } from 'mysql2';
import db from './db';

/**
 * FC199 F2 — frontera SQL de `auth_throttle_counters` (migración 180). Solo contadores con ventana,
 * por llave HMAC (el servicio la calcula; aquí nunca llega un usuario, IP o correo en claro). El
 * reloj es el de la DB (`NOW()`), igual que los retos de MFA: varios workers ven la misma hora.
 */

export interface ThrottleCounter {
  counter: number;
  secondsSinceLast: number;
}

/** Contador vigente (dentro de la ventana) y segundos desde el último intento; `null` si no hay. */
export async function readCounter(
  keyHash: string,
  windowSeconds: number
): Promise<ThrottleCounter | null> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT counter, TIMESTAMPDIFF(SECOND, last_attempt_at, NOW()) AS seconds_since_last
       FROM auth_throttle_counters
      WHERE key_hash = ? AND window_start > NOW() - INTERVAL ? SECOND`,
    [keyHash, windowSeconds]
  );
  if (rows.length === 0) return null;
  return {
    counter: Number(rows[0].counter),
    secondsSinceLast: Number(rows[0].seconds_since_last),
  };
}

/** Suma un intento en la ventana y devuelve el total. Si la ventana venció, reinicia en 1. Es una
 *  sola sentencia atómica: en el UPDATE, `counter` se evalúa antes de mover `window_start`. */
export async function hitCounter(keyHash: string, windowSeconds: number): Promise<number> {
  await db.execute<ResultSetHeader>(
    `INSERT INTO auth_throttle_counters (key_hash) VALUES (?)
     ON DUPLICATE KEY UPDATE
       counter = IF(window_start <= NOW() - INTERVAL ? SECOND, 1, counter + 1),
       window_start = IF(window_start <= NOW() - INTERVAL ? SECOND, NOW(), window_start),
       last_attempt_at = NOW()`,
    [keyHash, windowSeconds, windowSeconds]
  );
  const current = await readCounter(keyHash, windowSeconds);
  return current?.counter ?? 1;
}

/** Borra el contador (p. ej. tras un login correcto). */
export async function clearCounter(keyHash: string): Promise<void> {
  await db.execute<ResultSetHeader>('DELETE FROM auth_throttle_counters WHERE key_hash = ?', [
    keyHash,
  ]);
}

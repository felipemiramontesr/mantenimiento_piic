import { ResultSetHeader, RowDataPacket } from 'mysql2';
import db from './db';

/**
 * FC199 F4 — frontera SQL del barrido de higiene de autenticación (triple barrido, 427_AN O ·
 * 428_AN R). Todo con el reloj de la DB y sin valores interpolados.
 *
 * Cuenta purgable (Inv-5 · Cond.R-199 P9): nació del registro público, tiene más de 48 h, nunca
 * confirmó un factor MFA (`is_confirmed = 1`) y no pertenece a ningún tenant. Por el 2FA universal
 * (FC195) una cuenta así nunca tuvo sesión completa. Además se excluyen las dos referencias que
 * impedirían el DELETE (`tenants.mu_user_id` RESTRICT y `financial_transactions.created_by`
 * NO ACTION), para que el borrado nunca falle a medias.
 */

// La condición va ESCRITA en ambas sentencias (literales, 0 interpolación: A03/S2077); la prueba
// authHousekeeping.repository.test.ts exige que las dos lleven exactamente las mismas cláusulas.

/** Ids de las cuentas que cumplen hoy la condición de purga. */
export async function findPurgeableAccountIds(): Promise<number[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT u.id FROM users u
      WHERE u.signup_source = 'public'
        AND u.created_at < NOW() - INTERVAL 48 HOUR
        AND NOT EXISTS (SELECT 1 FROM user_mfa_credentials c WHERE c.user_id = u.id AND c.is_confirmed = 1)
        AND NOT EXISTS (SELECT 1 FROM tenant_user_memberships m WHERE m.user_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.mu_user_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM financial_transactions f WHERE f.created_by = u.id)`
  );
  return rows.map((row) => Number(row.id));
}

/** Borra UNA cuenta volviendo a verificar la condición en la misma sentencia: si entre la
 *  búsqueda y el borrado confirmó su 2FA o entró a un tenant, no se toca. `true` si se borró. */
export async function deletePurgeableAccount(userId: number): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    `DELETE u FROM users u
      WHERE u.id = ?
        AND u.signup_source = 'public'
        AND u.created_at < NOW() - INTERVAL 48 HOUR
        AND NOT EXISTS (SELECT 1 FROM user_mfa_credentials c WHERE c.user_id = u.id AND c.is_confirmed = 1)
        AND NOT EXISTS (SELECT 1 FROM tenant_user_memberships m WHERE m.user_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.mu_user_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM financial_transactions f WHERE f.created_by = u.id)`,
    [userId]
  );
  return result.affectedRows === 1;
}

/** Retos PoW vencidos: ya no pueden reusarse (la verificación rechaza por caducidad). */
export async function deleteExpiredNonces(): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM auth_challenge_nonces WHERE expires_at < NOW()'
  );
  return result.affectedRows;
}

/** Contadores sin actividad en más de 24 h: fuera de toda ventana (login 15 min, correo 24 h). */
export async function deleteStaleCounters(): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM auth_throttle_counters WHERE last_attempt_at < NOW() - INTERVAL 24 HOUR'
  );
  return result.affectedRows;
}

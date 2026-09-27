import { ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC199 F3 — frontera SQL de `auth_challenge_nonces` (migración 180): registro de un solo uso de los
 * retos PoW resueltos (anti-replay, Cond.R-199 P2/P6). En MySQL y no en RAM: varios workers.
 */

/** Consume el reto. `true` solo la PRIMERA vez (INSERT IGNORE sobre la PK); una repetición → `false`. */
export default async function consumeNonce(
  nonceHash: string,
  expiresAtUnix: number
): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    'INSERT IGNORE INTO auth_challenge_nonces (nonce_hash, expires_at) VALUES (?, FROM_UNIXTIME(?))',
    [nonceHash, expiresAtUnix]
  );
  return result.affectedRows === 1;
}

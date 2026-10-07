import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC206 — SQL boundary for adding an EXISTING user to an EXISTING Universo (Ω direct link in F1,
 * the MU invitation in F2). Split out because `cosmology.repository.ts` sits at ESLint's
 * `max-lines:400` ceiling. Membership rows set `cosmonaut_type` explicitly (R 511_AN).
 */
type Executor = Pool | PoolConnection;

export type CosmonautType = 'MU' | 'ARC';

export interface LinkTargetTenant {
  id: number;
  label: string;
  hasMu: boolean;
}

/** The destination Universo with its MU anchor (`tenants.mu_user_id`), or null if it doesn't exist. */
export async function findLinkTargetTenant(
  tenantId: number,
  executor: Executor = db
): Promise<LinkTargetTenant | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT id, label, mu_user_id FROM tenants WHERE id = ?',
    [tenantId]
  );
  if (rows.length === 0) return null;
  return { id: rows[0].id, label: rows[0].label, hasMu: rows[0].mu_user_id !== null };
}

/** Membership row with its cosmonaut type set in the same INSERT. */
export async function insertTypedMembership(
  userId: number,
  tenantId: number,
  cosmonautType: CosmonautType,
  executor: Executor
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'INSERT INTO tenant_user_memberships (user_id, owner_id, cosmonaut_type) VALUES (?, ?, ?)',
    [userId, tenantId, cosmonautType]
  );
}

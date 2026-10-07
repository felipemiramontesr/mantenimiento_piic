import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import db from './db';

/**
 * T7 — the Universos directory query, split out of `cosmology.repository.ts` (at ESLint's
 * `max-lines:400` ceiling) when FC206 F1 added `hasMu` (the MU anchor, so the console only offers
 * the MU role where the Universo has none).
 */
type Executor = Pool | PoolConnection;

export interface UniverseListRow extends RowDataPacket {
  id: number;
  label: string;
  universeTypeCode: string;
  activeSuperclusters: number;
  activeClusters: number;
  hasMu: number;
}

/** T7 — every Universo with its type and a quick census of active SC/Cúmulo counts. */
export async function listUniverses(executor: Executor = db): Promise<UniverseListRow[]> {
  const [rows] = await executor.execute<UniverseListRow[]>(
    `SELECT t.id, t.label, ut.code AS universeTypeCode, (t.mu_user_id IS NOT NULL) AS hasMu,
       (SELECT COUNT(*) FROM universe_superclusters us
          WHERE us.tenant_id = t.id AND us.state = 'ACTIVE') AS activeSuperclusters,
       (SELECT COUNT(*) FROM universe_clusters uc
          WHERE uc.tenant_id = t.id AND uc.state = 'ACTIVE') AS activeClusters
     FROM tenants t
     JOIN universe_types ut ON ut.id = t.universe_type_id
     ORDER BY t.id`
  );
  return rows;
}

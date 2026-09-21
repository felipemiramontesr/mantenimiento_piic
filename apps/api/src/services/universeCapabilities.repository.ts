import { RowDataPacket } from 'mysql2';
import db from './db';

/**
 * FC193 F2 — SQL boundary de las capacidades ACTIVAS de un universo (`universe_superclusters` y
 * `universe_clusters`, migraciones 152/161). Solo lectura. Columnas explícitas (Libro II §6.2
 * anti-BOPLA) y filtro obligatorio por `tenant_id` (anti-BOLA): jamás devuelve el estado de otro universo.
 */
export interface ActiveCapabilityRow extends RowDataPacket {
  kind: 'SUPERCLUSTER' | 'CLUSTER';
  code: string;
}

/** Códigos de SC y de cluster en estado ACTIVE para `tenantId` (SUSPENDED/REMOVED no aparecen). */
export default async function findActiveCapabilities(
  tenantId: number
): Promise<ActiveCapabilityRow[]> {
  const [rows] = await db.execute<ActiveCapabilityRow[]>(
    `SELECT 'SUPERCLUSTER' AS kind, sc.code AS code
     FROM universe_superclusters us
     JOIN superclusters_catalog sc ON sc.id = us.supercluster_id
     WHERE us.tenant_id = ? AND us.state = 'ACTIVE'
     UNION ALL
     SELECT 'CLUSTER' AS kind, cc.code AS code
     FROM universe_clusters uc
     JOIN clusters_catalog cc ON cc.id = uc.cluster_id
     WHERE uc.tenant_id = ? AND uc.state = 'ACTIVE'`,
    [tenantId, tenantId]
  );
  return rows;
}

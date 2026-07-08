import { RowDataPacket } from 'mysql2';
import db from './db';

// FC 067 F4 — Finanzas_Cluster_Granularity (§24.3 Cúmulo · §24.0.4)
// Archonaut ve solo gasto personal; el resto de owner_types ve el set completo.
export const FINANCE_PERSONAL_CATEGORIES = [
  'MAINTENANCE',
  'FUEL',
  'TIRE',
  'REPAIR',
  'TENENCIA',
  'VERIFICACION',
  'OTHER',
] as const;

export interface FinanceClusterScope {
  /** Subconjunto de ownerIds cuyo Cúmulo gastos_egresos está ACTIVE (T1). */
  activeOwnerIds: number[];
  /** null = sin restricción de categoría; array = categorías permitidas (T2). */
  categoryFilter: readonly string[] | null;
}

interface ClusterRow extends RowDataPacket {
  ownerId: number;
  ownerType: string;
  clusterActive: number | null;
}

/**
 * T1 ClusterVisible(SC_activo, Cúmulo_activo) + T2 ArchonautScope — FC 067 F4.
 * Fail-closed: un tenant sin filas en universe_superclusters/universe_clusters
 * (LEFT JOIN → NULL) se resuelve como inactivo, nunca como permitido por defecto.
 */
export async function resolveFinanceClusterScope(ownerIds: number[]): Promise<FinanceClusterScope> {
  if (ownerIds.length === 0) {
    return { activeOwnerIds: [], categoryFilter: null };
  }
  const placeholders = ownerIds.map(() => '?').join(', ');
  const [rows] = await db.execute<ClusterRow[]>(
    `SELECT
       t.id AS ownerId,
       otc.code AS ownerType,
       (us.state = 'ACTIVE' AND uc.state = 'ACTIVE') AS clusterActive
     FROM tenants t
     JOIN owner_types_catalog otc ON otc.id = t.owner_type_id
     LEFT JOIN universe_superclusters us
       ON us.tenant_id = t.id
      AND us.supercluster_id = (SELECT id FROM superclusters_catalog WHERE code = 'FINANZAS')
     LEFT JOIN universe_clusters uc
       ON uc.tenant_id = t.id
      AND uc.cluster_id = (SELECT id FROM clusters_catalog WHERE code = 'GASTOS_EGRESOS')
     WHERE t.id IN (${placeholders})`,
    ownerIds
  );

  const activeOwnerIds = rows.filter((r) => Number(r.clusterActive) === 1).map((r) => r.ownerId);
  const hasArchonaut = rows.some((r) => r.ownerType === 'ARCHONAUT');

  return {
    activeOwnerIds,
    categoryFilter: hasArchonaut ? FINANCE_PERSONAL_CATEGORIES : null,
  };
}

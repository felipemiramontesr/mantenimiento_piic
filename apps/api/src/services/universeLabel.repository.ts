import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC192 — SQL boundary del NOMBRE del universo (`tenants.label` + `common_catalogs.label`, categoría
 * UNIVERSE_TENANT). Separado de `cosmology.repository.ts` (composición SC/cluster) por el tope de
 * líneas por archivo. Columnas explícitas, sin `SELECT *` (Libro II §6.2 anti-BOPLA).
 */
type Executor = Pool | PoolConnection;

export interface UniverseIdentityRow extends RowDataPacket {
  id: number;
  label: string;
  /** `common_catalogs.code` (slug inmutable); NULL si el universo no tiene su fila UNIVERSE_TENANT. */
  code: string | null;
}

/** Identidad del universo, con bloqueo de fila (`FOR UPDATE`): serializa renombrados concurrentes del
 *  mismo universo. Se lee dentro de la TX del renombrado. */
export async function findUniverseIdentityForUpdate(
  tenantId: number,
  executor: Executor = db
): Promise<UniverseIdentityRow | null> {
  const [rows] = await executor.execute<UniverseIdentityRow[]>(
    `SELECT t.id, t.label, cc.code AS code
     FROM tenants t
     LEFT JOIN common_catalogs cc ON cc.id = t.id AND cc.category = 'UNIVERSE_TENANT'
     WHERE t.id = ?
     FOR UPDATE`,
    [tenantId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Id de OTRO universo (distinto de `excludeTenantId`) cuyo nombre normalizado coincide con `label`,
 *  o null. La colación de `tenants.label` (`utf8mb4_unicode_ci`) ya ignora mayúsculas y acentos;
 *  `LOWER(TRIM())` lo hace explícito. Sin exclusión (crear) se pasa 0: ningún tenant tiene id 0. */
export async function findUniverseIdByLabel(
  label: string,
  excludeTenantId: number,
  executor: Executor = db
): Promise<number | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT id FROM tenants WHERE LOWER(TRIM(label)) = LOWER(?) AND id <> ? LIMIT 1',
    [label, excludeTenantId]
  );
  return rows.length > 0 ? Number(rows[0].id) : null;
}

/** `UPDATE tenants SET label` — devuelve las filas afectadas (esperado: 1). */
export async function renameTenantLabel(
  tenantId: number,
  label: string,
  executor: Executor = db
): Promise<number> {
  const [result] = await executor.execute<ResultSetHeader>(
    'UPDATE tenants SET label = ? WHERE id = ?',
    [label, tenantId]
  );
  return result.affectedRows;
}

/** `UPDATE common_catalogs SET label` de la fila UNIVERSE_TENANT del universo — filas afectadas (esperado: 1). */
export async function renameUniverseCatalogLabel(
  tenantId: number,
  label: string,
  executor: Executor = db
): Promise<number> {
  const [result] = await executor.execute<ResultSetHeader>(
    "UPDATE common_catalogs SET label = ? WHERE id = ? AND category = 'UNIVERSE_TENANT'",
    [label, tenantId]
  );
  return result.affectedRows;
}

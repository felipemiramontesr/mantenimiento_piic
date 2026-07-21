import { RowDataPacket } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';
import db from './db';

// FC 082 F2b1 — dual-write ENUM→common_catalogs (Cond.2 Bravo, 2026-07-21).
// Fail-closed por diseño: un código sin fila en common_catalogs lanza
// CatalogMappingError en vez de dejar la columna *_id en NULL en silencio.
export type CatalogCategory =
  | 'FINANCE_CATEGORY'
  | 'FINANCE_SOURCE'
  | 'MAINT_SERVICE_TYPE'
  | 'INCIDENT_CATEGORY';

export class CatalogMappingError extends Error {
  constructor(public readonly category: CatalogCategory, public readonly code: string) {
    super(`Código no catalogado: ${category}/${code}`);
    this.name = 'CatalogMappingError';
  }
}

interface CatalogIdRow extends RowDataPacket {
  id: number;
}

export async function resolveCatalogId(
  category: CatalogCategory,
  code: string,
  executor: Pool | PoolConnection = db
): Promise<number> {
  const [rows] = await executor.execute<CatalogIdRow[]>(
    'SELECT id FROM common_catalogs WHERE category = ? AND code = ?',
    [category, code]
  );
  if (rows.length === 0) {
    throw new CatalogMappingError(category, code);
  }
  return rows[0].id;
}

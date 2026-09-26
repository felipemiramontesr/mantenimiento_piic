/**
 * FC197 F1 — línea base de `schema_migrations`.
 *
 * Recorre `packages/database/migrations/`, calcula el SHA-256 de cada migración anterior a la 179
 * y genera el `INSERT IGNORE` que la migración 179 lleva incrustado, para que local y producción
 * arranquen con el mismo registro.
 *
 * El checksum se calcula sobre el contenido SIN ningún `\r` (Cond.R-197: idéntico a
 * `tr -d '\r' | sha256sum` del workflow). Con `core.autocrlf=true`, la misma migración tiene CRLF
 * en una copia de trabajo de Windows y LF en git o en Linux; sin normalizar, el hash cambiaría según
 * la máquina y daría falsas alertas de alteración.
 *
 * Uso: `bun scripts/dbBaselineMigrations.ts` imprime el bloque SQL.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'packages', 'database', 'migrations');

/** Primera migración que ya se registra por sí misma (la que crea `schema_migrations`). */
export const FIRST_TRACKED_MIGRATION = 179;

/** Quién y dónde, para las filas de la línea base (no las aplicó nadie hoy: ya estaban). */
export const BASELINE_EXECUTED_BY = 'FC197-baseline';
export const BASELINE_ENVIRONMENT = 'baseline';

/** `NNN_nombre.sql`; también `NNNz_nombre.sql` (existen `125z_` y `127z_`, que ordenan después de
 *  su número). */
const MIGRATION_FILE = /^(\d{3})[a-z]?_[\w.-]+\.sql$/;

/** SHA-256 del contenido sin `\r` — mismo valor en Windows, Linux y git. */
export function migrationChecksum(content: string): string {
  return createHash('sha256').update(content.replace(/\r/g, ''), 'utf8').digest('hex');
}

/** Número de la migración (`062_x.sql` → 62), o `null` si el nombre no es una migración. */
export function migrationNumber(filename: string): number | null {
  const match = MIGRATION_FILE.exec(filename);
  return match ? Number(match[1]) : null;
}

/** Archivos de migración anteriores a `before`, en orden de nombre. Los números repetidos
 *  (p. ej. dos `062_*`) son archivos distintos: la llave es el nombre completo. */
export function baselineFiles(filenames: readonly string[], before: number): string[] {
  return filenames
    .filter((name) => {
      const n = migrationNumber(name);
      return n !== null && n < before;
    })
    .sort((a, b) => a.localeCompare(b));
}

export interface BaselineEntry {
  readonly filename: string;
  readonly checksum: string;
}

/** Nombres de archivo seguros para ir literales en el SQL (el patrón ya excluye comillas). */
function assertSafeFilename(filename: string): void {
  if (!MIGRATION_FILE.test(filename)) {
    throw new Error(`Nombre de migración inesperado: ${filename}`);
  }
}

/** Bloque `INSERT IGNORE` de la línea base (idempotente: re-aplicarlo no duplica ni pisa). */
export function buildBaselineSql(entries: readonly BaselineEntry[]): string {
  const rows = entries.map((e) => {
    assertSafeFilename(e.filename);
    return `  ('${e.filename}', '${e.checksum}', '${BASELINE_EXECUTED_BY}', '${BASELINE_ENVIRONMENT}')`;
  });
  return (
    'INSERT IGNORE INTO schema_migrations (filename, checksum_sha256, executed_by, environment) VALUES\n' +
    `${rows.join(',\n')};\n`
  );
}

/** Entradas de la línea base leídas del directorio real de migraciones. */
export function readBaselineEntries(dir: string = MIGRATIONS_DIR): BaselineEntry[] {
  return baselineFiles(readdirSync(dir), FIRST_TRACKED_MIGRATION).map((filename) => ({
    filename,
    checksum: migrationChecksum(readFileSync(join(dir, filename), 'utf8')),
  }));
}

if (import.meta.main) {
  process.stdout.write(buildBaselineSql(readBaselineEntries()));
}

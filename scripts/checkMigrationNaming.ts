/**
 * FC197 F3 — Regla 24 · R-MIGRATION-NAMING. Gate de nomenclatura de migraciones (pre-commit y CI).
 *
 * Desde la 180, todo archivo de `packages/database/migrations/` debe llamarse
 *   NNN_V<versión>_FC<nnn>-F<n>_<AAAAMMDD>_<descripcion>.sql
 *   ej. 180_V78.103.245_FC197-F3_20260926_schema_parity_fingerprint.sql
 * con número único y una cabecera que repita el milestone (`FC197 F3` o `FC197-F3`) y la fecha
 * (`2026-09-26`). Las anteriores (001–179) están CONGELADAS: son la llave de `schema_migrations`
 * con checksum registrado (Inv-2); no se renombran ni se agregan nuevas por debajo de la 180.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MIGRATIONS_DIR, migrationNumber } from './dbBaselineMigrations';

export const FIRST_NAMED_MIGRATION = 180;
const MIGRATION_179 = '179_schema_migrations_and_orphan_backup_purge.sql';

/** Formato canónico (Regla 24). Grupos: número, versión, FC, fase, fecha, descripción. */
export const CANONICAL_NAME =
  /^(\d{3})_V(\d+\.\d+\.\d+)_FC(\d{3})-F(\d+)_(\d{4})(\d{2})(\d{2})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/;

/** ¿`AAAA-MM-DD` existe en el calendario? (descarta 20260231 y similares). */
function isRealDate(year: string, month: string, day: string): boolean {
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(`${year}-${month}-${day}`);
}

/** Errores de nombre y cabecera de UNA migración ≥180 (vacío = válida). */
export function checkCanonicalMigration(filename: string, content: string): string[] {
  const m = CANONICAL_NAME.exec(filename);
  if (!m) {
    return [
      `${filename}: no cumple NNN_V<versión>_FC<nnn>-F<n>_<AAAAMMDD>_<descripcion>.sql (Regla 24)`,
    ];
  }
  const [, , , fc, phase, year, month, day] = m;
  const errors: string[] = [];
  if (!isRealDate(year, month, day))
    errors.push(`${filename}: fecha inexistente ${year}${month}${day}`);
  if (!new RegExp(`FC${fc}[ -]F${phase}\\b`).test(content)) {
    errors.push(`${filename}: la cabecera no menciona el milestone FC${fc} F${phase}`);
  }
  if (!content.includes(`${year}-${month}-${day}`)) {
    errors.push(`${filename}: la cabecera no menciona la fecha ${year}-${month}-${day}`);
  }
  return errors;
}

/** Nombres anteriores a la 180 permitidos: la línea base incrustada en la 179 + la 179. */
export function frozenMigrations(migration179: string): Set<string> {
  const names = Array.from(migration179.matchAll(/\('([^']+\.sql)', '[0-9a-f]{64}'/g)).map(
    (match) => match[1]
  );
  return new Set([...names, MIGRATION_179]);
}

/** Todos los errores de nomenclatura del directorio (vacío = válido). */
export function checkMigrationNaming(
  files: readonly { filename: string; content: string }[],
  frozen: ReadonlySet<string>
): string[] {
  const errors: string[] = [];
  const seen = new Map<number, string>();
  files
    .filter((f) => f.filename.endsWith('.sql'))
    .forEach((f) => {
      const n = migrationNumber(f.filename);
      if (n === null || n < FIRST_NAMED_MIGRATION) {
        if (!frozen.has(f.filename)) {
          errors.push(
            `${f.filename}: las migraciones anteriores a la ${FIRST_NAMED_MIGRATION} están congeladas`
          );
        }
        return;
      }
      const previous = seen.get(n);
      if (previous) errors.push(`${f.filename}: repite el número ${n} de ${previous}`);
      seen.set(n, f.filename);
      errors.push(...checkCanonicalMigration(f.filename, f.content));
    });
  return errors;
}

function main(): number {
  const files = readdirSync(MIGRATIONS_DIR).map((filename) => ({
    filename,
    content: readFileSync(join(MIGRATIONS_DIR, filename), 'utf8'),
  }));
  const frozen = frozenMigrations(readFileSync(join(MIGRATIONS_DIR, MIGRATION_179), 'utf8'));
  const errors = checkMigrationNaming(files, frozen);
  if (errors.length > 0) {
    errors.forEach((e) => process.stderr.write(`[FAIL] ${e}\n`));
    return 1;
  }
  process.stdout.write(
    `[OK] Regla 24 · R-MIGRATION-NAMING — ${files.length} migraciones; ${frozen.size} congeladas (001–179).\n`
  );
  return 0;
}

if (import.meta.main) {
  process.exit(main());
}

/**
 * FC197 F2 — aplica en la base LOCAL (`archon`) las migraciones pendientes y las registra en
 * `schema_migrations`, con las mismas reglas que `db-migrations.yml` en producción:
 *   - no registrada           → se aplica y se registra (environment = 'local');
 *   - registrada, mismo hash  → se salta;
 *   - registrada, otro hash   → ALTO: el archivo cambió después de aplicarse (0 cambios en la DB);
 *   - sin `schema_migrations` → solo se aplica la 179, que la crea.
 * Primero se planea TODO; si el plan tiene una alteración, no se aplica nada.
 *
 * R-DB-PARITY: toda migración pasa por aquí (local) ANTES de despacharla a producción.
 *
 * Uso: `bun scripts/dbMigrateLocal.ts` (aplica) · `bun scripts/dbMigrateLocal.ts --dry-run` (solo el
 * plan). Variables: MYSQL_BIN (por defecto el de XAMPP), DB_LOCAL_NAME (archon), DB_LOCAL_USER (root).
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { join } from 'node:path';
import { MIGRATIONS_DIR, baselineFiles, migrationChecksum } from './dbBaselineMigrations';

export const BOOTSTRAP_FILE = '179_schema_migrations_and_orphan_backup_purge.sql';

export type MigrationAction = 'apply' | 'skip' | 'tamper';

export interface PlannedMigration {
  readonly filename: string;
  readonly checksum: string;
  readonly action: MigrationAction;
}

/** Decide qué hacer con cada archivo según el registro (`null` = la tabla aún no existe). */
export function planMigrations(
  files: readonly { filename: string; checksum: string }[],
  registry: ReadonlyMap<string, string> | null
): PlannedMigration[] {
  if (registry === null) {
    return files
      .filter((f) => f.filename === BOOTSTRAP_FILE)
      .map((f) => ({ ...f, action: 'apply' as const }));
  }
  return files.map((f) => {
    const registered = registry.get(f.filename);
    if (registered === undefined) return { ...f, action: 'apply' as const };
    return { ...f, action: registered === f.checksum ? ('skip' as const) : ('tamper' as const) };
  });
}

/** `usuario` apto para ir literal al SQL (el nombre de archivo ya lo acota su patrón). */
export function safeExecutor(name: string): string {
  const clean = name.replace(/[^A-Za-z0-9_.-]/g, '');
  return clean.length > 0 ? `local:${clean}` : 'local';
}

/** Fila de registro de una migración aplicada en local. */
export function recordSql(filename: string, checksum: string, executedBy: string): string {
  return (
    'REPLACE INTO schema_migrations (filename, checksum_sha256, executed_by, environment) ' +
    `VALUES ('${filename}', '${checksum}', '${executedBy}', 'local')`
  );
}

/** Registro actual como mapa archivo → checksum, o `null` si la tabla no existe. */
export function parseRegistry(hasTable: string, rows: string): Map<string, string> | null {
  if (hasTable.trim() === '0') return null;
  const registry = new Map<string, string>();
  rows
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .forEach((line) => {
      const [filename, checksum] = line.split('\t');
      registry.set(filename, checksum);
    });
  return registry;
}

const MYSQL_BIN = process.env.MYSQL_BIN ?? 'C:/xampp/mysql/bin/mysql.exe';
const DB_NAME = process.env.DB_LOCAL_NAME ?? 'archon';
const DB_USER = process.env.DB_LOCAL_USER ?? 'root';

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

function mysql(args: string[], input?: string): string {
  const res = spawnSync(MYSQL_BIN, ['-u', DB_USER, ...args, DB_NAME], {
    input,
    encoding: 'utf8',
  });
  if (res.status !== 0) throw new Error(res.stderr || `mysql terminó con ${res.status}`);
  return res.stdout;
}

function readRegistry(): Map<string, string> | null {
  const hasTable = mysql([
    '-N',
    '-B',
    '-e',
    "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schema_migrations'",
  ]);
  if (hasTable.trim() === '0') return null;
  return parseRegistry(
    hasTable,
    mysql(['-N', '-B', '-e', 'SELECT filename, checksum_sha256 FROM schema_migrations'])
  );
}

function main(dryRun: boolean): number {
  const files = baselineFiles(readdirSync(MIGRATIONS_DIR), 1000).map((filename) => ({
    filename,
    checksum: migrationChecksum(readFileSync(join(MIGRATIONS_DIR, filename), 'utf8')),
  }));
  const plan = planMigrations(files, readRegistry());
  const tampered = plan.filter((p) => p.action === 'tamper');
  if (tampered.length > 0) {
    tampered.forEach((p) =>
      process.stderr.write(`ALTO: ${p.filename} cambió después de aplicarse\n`)
    );
    return 1;
  }
  const pending = plan.filter((p) => p.action === 'apply');
  say(`Pendientes: ${pending.length} · ya aplicadas: ${plan.length - pending.length}`);
  if (dryRun) {
    pending.forEach((p) => say(`  aplicaría ${p.filename}`));
    return 0;
  }
  const executedBy = safeExecutor(userInfo().username);
  pending.forEach((p) => {
    mysql(
      ['--default-character-set=utf8mb4'],
      readFileSync(join(MIGRATIONS_DIR, p.filename), 'utf8')
    );
    mysql(['-e', recordSql(p.filename, p.checksum, executedBy)]);
    say(`  aplicada y registrada ${p.filename}`);
  });
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.includes('--dry-run')));
}

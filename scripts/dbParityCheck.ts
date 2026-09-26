/**
 * FC197 F3 — huella de esquema para la paridad local ↔ producción (Regla 23 · R-DB-PARITY).
 *
 * La consulta vive en `scripts/sql/schemaFingerprint.sql` (fuente única: la misma la corre el
 * workflow `db-migrations.yml` en producción e imprime el resultado en su resumen). Solo lee
 * information_schema: 0 datos.
 *
 * Uso:
 *   bun scripts/dbParityCheck.ts                    → huella de la base local (archon)
 *   bun scripts/dbParityCheck.ts --expect <md5>     → compara con la de producción; exit 1 si difiere
 *   bun scripts/dbParityCheck.ts --sql <base>       → imprime la consulta con la base explícita
 *                                                     (para pegarla en phpMyAdmin)
 * Variables: MYSQL_BIN (por defecto el de XAMPP), DB_LOCAL_NAME (archon), DB_LOCAL_USER (root).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const FINGERPRINT_SQL_PATH = join(import.meta.dirname, 'sql', 'schemaFingerprint.sql');

const DB_BINDING = 'SET @db := DATABASE();';
const DB_NAME_PATTERN = /^\w+$/;

/** La consulta con una base EXPLÍCITA en lugar de `DATABASE()`: en phpMyAdmin la base
 *  seleccionada puede ser otra (una vez corrió sobre information_schema). */
export function sqlForDatabase(sql: string, database: string): string {
  if (!DB_NAME_PATTERN.test(database)) throw new Error(`Nombre de base inválido: ${database}`);
  if (!sql.includes(DB_BINDING)) throw new Error('La consulta no declara la base con DATABASE()');
  return sql.replace(DB_BINDING, `SET @db := '${database}';`);
}

export interface Fingerprint {
  readonly hash: string;
  readonly elements: number;
}

/** Salida de `mysql -N -B`: "<md5>\t<elementos>". */
export function parseFingerprint(output: string): Fingerprint {
  const match = /^([0-9a-f]{32})\t(\d+)\s*$/m.exec(output);
  if (!match) throw new Error(`Salida inesperada de la huella: ${output.trim()}`);
  return { hash: match[1], elements: Number(match[2]) };
}

/** Veredicto de paridad contra la huella de producción. */
export function parityVerdict(local: Fingerprint, expected: string): string {
  return local.hash === expected.trim().toLowerCase()
    ? `PARITY: 100% MATCH (${local.hash}, ${local.elements} elementos)`
    : `PARITY: DRIFT — local ${local.hash} ≠ producción ${expected.trim()}`;
}

function localFingerprint(): Fingerprint {
  const res = spawnSync(
    process.env.MYSQL_BIN ?? 'C:/xampp/mysql/bin/mysql.exe',
    ['-u', process.env.DB_LOCAL_USER ?? 'root', '-N', '-B', process.env.DB_LOCAL_NAME ?? 'archon'],
    { input: readFileSync(FINGERPRINT_SQL_PATH, 'utf8'), encoding: 'utf8' }
  );
  if (res.status !== 0) throw new Error(res.stderr || `mysql terminó con ${res.status}`);
  return parseFingerprint(res.stdout);
}

function argAfter(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

function main(): number {
  const database = argAfter('--sql');
  if (database !== undefined) {
    process.stdout.write(sqlForDatabase(readFileSync(FINGERPRINT_SQL_PATH, 'utf8'), database));
    return 0;
  }
  const local = localFingerprint();
  const expected = argAfter('--expect');
  if (expected === undefined) {
    process.stdout.write(`${local.hash}\t${local.elements}\n`);
    return 0;
  }
  const verdict = parityVerdict(local, expected);
  process.stdout.write(`${verdict}\n`);
  return verdict.startsWith('PARITY: 100%') ? 0 : 1;
}

if (import.meta.main) {
  process.exit(main());
}

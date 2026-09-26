import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MIGRATIONS_DIR,
  baselineFiles,
  buildBaselineSql,
  migrationChecksum,
  migrationNumber,
  readBaselineEntries,
} from './dbBaselineMigrations';

/**
 * FC197 F1 — línea base de `schema_migrations`. Además de las funciones puras, una guarda de
 * deriva: el bloque incrustado en la migración 179 debe coincidir EXACTAMENTE con lo que se
 * genera hoy desde los archivos en disco (si alguien edita una migración histórica, falla aquí).
 */

const MIGRATION_179 = join(MIGRATIONS_DIR, '179_schema_migrations_and_orphan_backup_purge.sql');

describe('migrationChecksum', () => {
  it('ignora todo \\r: el mismo archivo con CRLF y con LF da el mismo hash', () => {
    expect(migrationChecksum('SELECT 1;\r\nSELECT 2;\r\n')).toBe(
      migrationChecksum('SELECT 1;\nSELECT 2;\n')
    );
  });

  it('también quita un \\r suelto, igual que `tr -d "\\r"`', () => {
    expect(migrationChecksum('a\rb')).toBe(migrationChecksum('ab'));
  });

  it('SHA-256 en hexadecimal (64 caracteres) y sensible al contenido', () => {
    expect(migrationChecksum('x')).toMatch(/^[0-9a-f]{64}$/);
    expect(migrationChecksum('x')).not.toBe(migrationChecksum('y'));
  });
});

describe('migrationNumber / baselineFiles', () => {
  it.each([
    ['062_sovereign_rebuild.sql', 62],
    ['125z_stress_test_prod.sql', 125],
    ['README.md', null],
    ['62_corto.sql', null],
  ])('%s → %s', (name, n) => {
    expect(migrationNumber(name)).toBe(n);
  });

  it('solo archivos de migración anteriores al límite, ordenados; los números repetidos cuentan aparte', () => {
    expect(
      baselineFiles(
        ['179_x.sql', '062_b.sql', 'notas.txt', '062_a.sql', '125z_c.sql', '125_d.sql'],
        179
      )
    ).toEqual(['062_a.sql', '062_b.sql', '125_d.sql', '125z_c.sql']);
  });
});

describe('buildBaselineSql', () => {
  it('un solo INSERT IGNORE con las filas de la línea base', () => {
    const sql = buildBaselineSql([
      { filename: '001_a.sql', checksum: 'h1' },
      { filename: '002_b.sql', checksum: 'h2' },
    ]);

    expect(sql).toBe(
      'INSERT IGNORE INTO schema_migrations (filename, checksum_sha256, executed_by, environment) VALUES\n' +
        "  ('001_a.sql', 'h1', 'FC197-baseline', 'baseline'),\n" +
        "  ('002_b.sql', 'h2', 'FC197-baseline', 'baseline');\n"
    );
  });

  it('rechaza un nombre que no es de migración (nada raro llega literal al SQL)', () => {
    expect(() =>
      buildBaselineSql([{ filename: "x'; DROP TABLE users; --.sql", checksum: 'h' }])
    ).toThrow('Nombre de migración inesperado');
  });
});

describe('guarda de deriva — la 179 coincide con los archivos en disco', () => {
  const embedded = /-- BEGIN BASELINE\r?\n([\s\S]*?)-- END BASELINE/.exec(
    readFileSync(MIGRATION_179, 'utf8')
  );

  it('la 179 trae el bloque de línea base', () => {
    expect(embedded).not.toBeNull();
  });

  it('las 173 migraciones anteriores, con el checksum de hoy', () => {
    const entries = readBaselineEntries();

    expect(entries).toHaveLength(173);
    expect(embedded?.[1].replace(/\r/g, '')).toBe(buildBaselineSql(entries));
  });
});

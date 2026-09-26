import { describe, expect, it } from 'vitest';
import {
  CANONICAL_NAME,
  checkCanonicalMigration,
  checkMigrationNaming,
  frozenMigrations,
} from './checkMigrationNaming';

/**
 * FC197 F3 — Regla 24 · R-MIGRATION-NAMING (Scenario 5 del FC): formato canónico desde la 180,
 * número único, cabecera coherente y 001–179 congeladas.
 */

const GOOD = '180_V78.103.245_FC197-F3_20260926_schema_parity_fingerprint.sql';
const GOOD_HEADER = '-- Migration 180 — FC197 F3 · 2026-09-26\nSELECT 1;\n';
const FROZEN = new Set(['001_initial.sql', '179_schema_migrations_and_orphan_backup_purge.sql']);

describe('CANONICAL_NAME', () => {
  it.each([
    [GOOD, true],
    ['181_V78.103.246_FC198-F12_20261001_a.sql', true],
    ['180_schema_parity.sql', false],
    ['180_V78.103.245_FC197-F3_2026-09-26_x.sql', false],
    ['180_V.78.103.245_FC197-F3_20260926_x.sql', false],
    ['180_V78.103.245_FC197F3_20260926_x.sql', false],
    ['180_V78.103.245_FC197-F3_20260926_Mayusculas.sql', false],
    ['180z_V78.103.245_FC197-F3_20260926_x.sql', false],
  ])('%s → %s', (name, ok) => {
    expect(CANONICAL_NAME.test(name)).toBe(ok);
  });
});

describe('checkCanonicalMigration', () => {
  it('nombre y cabecera coherentes ⇒ sin errores', () => {
    expect(checkCanonicalMigration(GOOD, GOOD_HEADER)).toEqual([]);
  });

  it('acepta el milestone con guion en la cabecera', () => {
    expect(checkCanonicalMigration(GOOD, '-- FC197-F3 2026-09-26')).toEqual([]);
  });

  it('fecha que no existe en el calendario', () => {
    const name = '180_V78.103.245_FC197-F3_20260231_x.sql';
    expect(checkCanonicalMigration(name, '-- FC197 F3 2026-02-31')).toEqual([
      `${name}: fecha inexistente 20260231`,
    ]);
  });

  it('cabecera sin milestone ni fecha', () => {
    expect(checkCanonicalMigration(GOOD, 'SELECT 1;')).toEqual([
      `${GOOD}: la cabecera no menciona el milestone FC197 F3`,
      `${GOOD}: la cabecera no menciona la fecha 2026-09-26`,
    ]);
  });

  it('otra fase en la cabecera no cuenta (FC197 F30 ≠ FC197 F3)', () => {
    expect(checkCanonicalMigration(GOOD, '-- FC197 F30 · 2026-09-26')).toContain(
      `${GOOD}: la cabecera no menciona el milestone FC197 F3`
    );
  });

  it('nombre fuera de formato', () => {
    expect(checkCanonicalMigration('180_x.sql', '')).toEqual([
      '180_x.sql: no cumple NNN_V<versión>_FC<nnn>-F<n>_<AAAAMMDD>_<descripcion>.sql (Regla 24)',
    ]);
  });
});

describe('checkMigrationNaming', () => {
  it('congeladas + una canónica ⇒ válido; ignora lo que no es .sql', () => {
    const files = [
      { filename: '001_initial.sql', content: '' },
      { filename: '179_schema_migrations_and_orphan_backup_purge.sql', content: '' },
      { filename: GOOD, content: GOOD_HEADER },
      { filename: 'README.md', content: '' },
    ];

    expect(checkMigrationNaming(files, FROZEN)).toEqual([]);
  });

  it('una migración nueva por debajo de la 180 ⇒ congelada', () => {
    expect(checkMigrationNaming([{ filename: '050_nueva.sql', content: '' }], FROZEN)).toEqual([
      '050_nueva.sql: las migraciones anteriores a la 180 están congeladas',
    ]);
  });

  it('número repetido desde la 180', () => {
    const other = '180_V78.103.246_FC198-F1_20260927_otra.sql';
    const errors = checkMigrationNaming(
      [
        { filename: GOOD, content: GOOD_HEADER },
        { filename: other, content: '-- FC198 F1 · 2026-09-27' },
      ],
      FROZEN
    );

    expect(errors).toEqual([`${other}: repite el número 180 de ${GOOD}`]);
  });

  it('un nombre con número ≥180 pero fuera de formato', () => {
    expect(checkMigrationNaming([{ filename: '180_foo.sql', content: '' }], FROZEN)).toHaveLength(
      1
    );
  });
});

describe('frozenMigrations', () => {
  it('lee los nombres de la línea base de la 179 y agrega la 179', () => {
    const block = `INSERT IGNORE INTO schema_migrations VALUES\n  ('001_a.sql', '${'a'.repeat(
      64
    )}', 'FC197-baseline', 'baseline');`;

    expect(frozenMigrations(block)).toEqual(
      new Set(['001_a.sql', '179_schema_migrations_and_orphan_backup_purge.sql'])
    );
  });
});

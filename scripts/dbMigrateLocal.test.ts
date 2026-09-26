import { describe, expect, it } from 'vitest';
import {
  BOOTSTRAP_FILE,
  parseRegistry,
  planMigrations,
  recordSql,
  safeExecutor,
} from './dbMigrateLocal';

/**
 * FC197 F2 — runner local: la decisión por archivo es la misma que el paso "Registry gate" de
 * db-migrations.yml (Tabla de verdad 1 del FC: ALLOW_APP ≡ ¬EXISTS; REJECT ≡ EXISTS, y dentro de
 * REJECT, mismo hash = no-op y otro hash = alteración).
 */

const FILES = [
  { filename: '001_a.sql', checksum: 'h1' },
  { filename: '002_b.sql', checksum: 'h2' },
  { filename: BOOTSTRAP_FILE, checksum: 'h179' },
];

describe('planMigrations', () => {
  it('fila 1/2 — no registrada ⇒ se aplica', () => {
    const plan = planMigrations(FILES, new Map([['001_a.sql', 'h1']]));

    expect(plan.map((p) => [p.filename, p.action])).toEqual([
      ['001_a.sql', 'skip'],
      ['002_b.sql', 'apply'],
      [BOOTSTRAP_FILE, 'apply'],
    ]);
  });

  it('fila 3 — registrada con el mismo hash ⇒ se salta (no-op)', () => {
    const plan = planMigrations(FILES.slice(0, 1), new Map([['001_a.sql', 'h1']]));

    expect(plan[0].action).toBe('skip');
  });

  it('fila 4 — registrada con otro hash ⇒ alteración', () => {
    const plan = planMigrations(FILES.slice(0, 1), new Map([['001_a.sql', 'OTRO']]));

    expect(plan[0].action).toBe('tamper');
  });

  it('sin tabla schema_migrations ⇒ solo la 179 (bootstrap), nada más', () => {
    const plan = planMigrations(FILES, null);

    expect(plan).toEqual([{ filename: BOOTSTRAP_FILE, checksum: 'h179', action: 'apply' }]);
  });
});

describe('parseRegistry', () => {
  it('"0" (sin tabla) ⇒ null', () => {
    expect(parseRegistry('0\n', '')).toBeNull();
  });

  it('filas separadas por tabulador, tolera CRLF y líneas vacías', () => {
    const registry = parseRegistry('1', '001_a.sql\th1\r\n002_b.sql\th2\n\n');

    expect(registry).toEqual(
      new Map([
        ['001_a.sql', 'h1'],
        ['002_b.sql', 'h2'],
      ])
    );
  });
});

describe('recordSql / safeExecutor', () => {
  it('registra la migración como aplicada en local', () => {
    expect(recordSql('002_b.sql', 'h2', 'local:felip')).toBe(
      'REPLACE INTO schema_migrations (filename, checksum_sha256, executed_by, environment) ' +
        "VALUES ('002_b.sql', 'h2', 'local:felip', 'local')"
    );
  });

  it('el usuario del sistema no puede meter comillas al SQL', () => {
    expect(safeExecutor("fe'lip; DROP")).toBe('local:felipDROP');
    expect(safeExecutor("'';")).toBe('local');
  });
});

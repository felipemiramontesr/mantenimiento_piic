import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * FC204 F1b (Escenario 1b · R 487/491_AN) — migración 184: backfill del handle vacío con
 * `CONCAT('UNV-', id)`, solo DML, con aserción de colisión. Parse del SQL, sin DB; la corrida real se
 * prueba en una base desechable y en `dbMigrateLocal` (evidencia en F).
 */

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../packages/database/migrations/184_V78.103.276_FC204-F1_20261005_tenants_handle_backfill.sql'
);

const STATEMENTS = fs
  .readFileSync(MIGRATION_PATH, 'utf8')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

describe('Migración 184 — backfill de tenants.handle (FC204 F1b)', () => {
  it('solo DML: ningún DDL, la huella de esquema no cambia', () => {
    expect(STATEMENTS).not.toMatch(/\b(CREATE|ALTER|DROP|TRUNCATE|RENAME)\b/i);
  });

  it("toca solo handle = '' con CONCAT('UNV-', id), sin LPAD ni handle IS NULL", () => {
    expect(STATEMENTS).toContain(
      "UPDATE tenants SET handle = CONCAT('UNV-', id) WHERE handle = '';"
    );
    expect(STATEMENTS.match(/\bUPDATE\b/gi)).toHaveLength(1);
    expect(STATEMENTS).not.toMatch(/LPAD|IS NULL/i);
  });

  it('la aserción de colisión corre antes del UPDATE y aborta con una consulta fallida', () => {
    const assertion = STATEMENTS.indexOf('EXECUTE fc204b_stmt');
    expect(assertion).toBeGreaterThan(STATEMENTS.indexOf('START TRANSACTION'));
    expect(assertion).toBeLessThan(STATEMENTS.indexOf('UPDATE tenants'));
    expect(STATEMENTS).toContain(
      "JOIN tenants taken ON taken.handle = CONCAT('UNV-', empty_handle.id)"
    );
    expect(STATEMENTS).toContain(
      "IF(@fc204b_collisions = 0, 'DO 0', 'SELECT 1 FROM fc204b_assertion_failed_handle_candidate_exists')"
    );
    expect(STATEMENTS.indexOf('UPDATE tenants')).toBeLessThan(STATEMENTS.indexOf('COMMIT;'));
  });
});

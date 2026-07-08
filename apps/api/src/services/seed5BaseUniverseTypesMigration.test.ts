// FC 067 F2 — Seed_5_Base_Universe_Types (migración 160)
// Test estructural del SQL — la doble ejecución real (idempotencia) y los
// conteos de blueprint se verifican en local vía mysql CLI (Scenario 3 del FC).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const sql = readFileSync(
  resolve(__dirname, '../../../../packages/database/migrations/160_seed_5_base_universe_types.sql'),
  'utf8'
);

describe('FC 067 F2 — 160_seed_5_base_universe_types.sql', () => {
  it('declara charset utf8mb4 (§23.2 / §17.4)', () => {
    expect(sql).toContain('SET NAMES utf8mb4;');
  });

  it('siembra TSMS y ARCHONAUT de forma idempotente (INSERT IGNORE)', () => {
    expect(sql).toContain('INSERT IGNORE INTO universe_types');
    expect(sql).toContain("'TSMS'");
    expect(sql).toContain("'ARCHONAUT'");
  });

  it('nunca hardcodea IDs — lookup por code (§23.1)', () => {
    expect(sql).not.toMatch(/universe_type_id\s*[,)]?\s*VALUES\s*\(\s*\d/i);
    expect(sql).toContain("WHERE  ut.code = 'TSMS'");
    expect(sql).toContain("WHERE  ut.code = 'ARCHONAUT'");
  });

  it('TSMS recibe blueprint completo — CROSS JOIN con superclusters_catalog (Scenario 1)', () => {
    expect(sql).toMatch(/CROSS JOIN superclusters_catalog sc\s*\nWHERE\s+ut\.code = 'TSMS'/);
  });

  it('ARCHONAUT recibe únicamente FINANZAS — JOIN filtrado por code (Scenario 2)', () => {
    expect(sql).toMatch(
      /JOIN\s+superclusters_catalog sc ON sc\.code = 'FINANZAS'\s*\nWHERE\s+ut\.code = 'ARCHONAUT'/
    );
  });

  it('verificación final expone conteos agregados por tipo', () => {
    expect(sql).toContain('AS universe_types_total');
    expect(sql).toContain('AS tsms_sc_count');
    expect(sql).toContain('AS archonaut_sc_count');
  });

  it('no toca universe_superclusters (instancias por tenant — prohibido en esta fase)', () => {
    expect(sql).not.toMatch(/\bINSERT[\s\S]*?\bINTO\s+universe_superclusters\b/i);
  });
});

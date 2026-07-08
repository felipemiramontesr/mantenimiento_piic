// FC 067 F1 — Owner_Type_Catalog_Migration (migración 159)
// Test estructural del SQL: valida idempotencia, fail-closed y contenido del
// catálogo sin requerir DB viva (la doble ejecución real se verifica en local
// vía mysql CLI — Scenario 2 del FC).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const sql = readFileSync(
  resolve(__dirname, '../../../../packages/database/migrations/159_owner_type_catalog.sql'),
  'utf8'
);

describe('FC 067 F1 — 159_owner_type_catalog.sql', () => {
  it('declara charset utf8mb4 y collation unicode (§23.2 / §17.4)', () => {
    expect(sql).toContain('SET NAMES utf8mb4;');
    expect(sql).toContain('DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
  });

  it('crea el catálogo idempotente con UNIQUE sobre code', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS owner_types_catalog');
    expect(sql).toContain('UNIQUE KEY uq_owner_type_code (code)');
    expect(sql).toContain('INSERT IGNORE INTO owner_types_catalog');
  });

  it('siembra exactamente los 4 códigos — Scenario 3: ARCHONAUT presente', () => {
    ['FLOTILLA', 'PRIVATE', 'CENTER', 'ARCHONAUT'].forEach((code) => {
      expect(sql).toContain(`('${code}',`);
    });
    // ARCHONAUT es top-level, no sub-usuario — PRIVATE conserva su semántica
    expect(sql).toMatch(/PRIVATE[\s\S]*?parent_owner_id/);
  });

  it('agrega la FK column de forma idempotente y nullable para backfill seguro', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS owner_type_id TINYINT UNSIGNED NULL');
  });

  it('backfill guardado por information_schema vía PREPARE (idempotencia post-drop)', () => {
    expect(sql).toContain("COLUMN_NAME = 'owner_type'");
    expect(sql).toContain('PREPARE stmt FROM @sql');
    expect(sql).toMatch(
      /UPDATE tenants t JOIN owner_types_catalog otc ON otc\.code = t\.owner_type/
    );
    expect(sql).toContain('WHERE t.owner_type_id IS NULL');
  });

  it('opera sobre la tabla física tenants y recrea la vista owners (patrón 149)', () => {
    expect(sql).toContain('ALTER TABLE tenants');
    expect(sql).toContain('CREATE OR REPLACE VIEW owners AS SELECT * FROM tenants;');
  });

  it('fail-closed: NOT NULL antes del DROP — huérfanos abortan la migración (Scenario 1)', () => {
    const notNullPos = sql.indexOf('MODIFY COLUMN owner_type_id TINYINT UNSIGNED NOT NULL');
    const dropPos = sql.indexOf('DROP COLUMN IF EXISTS owner_type');
    expect(notNullPos).toBeGreaterThan(-1);
    expect(dropPos).toBeGreaterThan(-1);
    expect(notNullPos).toBeLessThan(dropPos);
  });

  it('índice explícito + FK al catálogo guardada por information_schema (recomendación Bravo)', () => {
    expect(sql).toContain('ADD INDEX IF NOT EXISTS idx_tenants_owner_type_id');
    // MariaDB 10.4 no soporta ADD CONSTRAINT IF NOT EXISTS — guard vía TABLE_CONSTRAINTS
    expect(sql).toContain("CONSTRAINT_NAME = 'fk_tenants_owner_type'");
    expect(sql).toContain('ADD CONSTRAINT fk_tenants_owner_type FOREIGN KEY (owner_type_id)');
    expect(sql).toContain('REFERENCES owner_types_catalog(id)');
  });

  it('verificación final con contadores agregados (tenants_orphans + legacy_enum_remaining)', () => {
    expect(sql).toContain('AS tenants_orphans');
    expect(sql).toContain('AS legacy_enum_remaining');
    expect(sql).toContain('AS archonaut_present');
  });
});

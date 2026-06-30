import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * AT-FC24-A: Migration 154 — Cosmonaut Type Schema Validation
 * Gherkin scenarios de Fase A del FC24_Cosmonaut_Implementation
 * Estrategia: parse del SQL file — no requiere conexión a DB.
 */

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../packages/database/migrations/154_cosmonaut_type.sql'
);

let sql: string;

beforeAll(() => {
  sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
});

// ─── Scenario 1: cosmonaut_type en tenant_user_memberships por par user↔tenant ───
// Given migration 154 aplicada
// When SELECT owner_id, COUNT(*) FROM tenant_user_memberships
//      WHERE cosmonaut_type='MU' GROUP BY owner_id HAVING COUNT(*) > 1
// Then debe retornar 0 filas (I1: exactamente 1 MU por Universo)

describe('AT-FC24-A-1: cosmonaut_type en tenant_user_memberships por par user↔tenant (I1)', () => {
  it('AT-FC24-A-1-1: PASO 1 agrega cosmonaut_type ENUM(MU,ARC) de forma idempotente', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS cosmonaut_type ENUM\('MU','ARC'\)/);
    expect(sql).toContain('ALTER TABLE tenant_user_memberships');
  });

  it('AT-FC24-A-1-2: designación de MU usa MIN(user_id) determinista por tenant', () => {
    expect(sql).toMatch(/MIN\(tum2\.user_id\)\s+AS\s+mu_uid/);
  });

  it('AT-FC24-A-1-3: candidatos MU se filtran por role_id IN (1, 3, 4)', () => {
    expect(sql).toMatch(/role_id IN \(1,\s*3,\s*4\)/);
  });

  it('AT-FC24-A-1-4: candidatos MU se agrupan por owner_id — garantiza I1 (1 MU por tenant)', () => {
    expect(sql).toMatch(/GROUP BY tum2\.owner_id/);
  });
});

// ─── Scenario 2: un usuario puede ser MU en un Universo y ARC en otro ────────────
// Given usuario con role_id=1 miembro de 2 tenants distintos
// When backfill ejecutado
// Then tiene cosmonaut_type='MU' en su tenant principal (MIN id)
// And  cosmonaut_type='ARC' en el segundo tenant si no es el MIN candidato

describe('AT-FC24-A-2: usuario puede ser MU en un Universo y ARC en otro', () => {
  it('AT-FC24-A-2-1: backfill ARC por defecto se aplica antes de designar MU (PASO 2 precede a PASO 3)', () => {
    const arcStep = sql.indexOf("SET tum.cosmonaut_type = 'ARC'");
    const muStep = sql.indexOf("SET tum.cosmonaut_type = 'MU'");
    expect(arcStep).toBeGreaterThan(-1);
    expect(muStep).toBeGreaterThan(-1);
    expect(arcStep).toBeLessThan(muStep);
  });

  it('AT-FC24-A-2-2: promoción a MU está scoped por (user_id, owner_id) — no solo por user_id global', () => {
    expect(sql).toMatch(/tum\.user_id\s*=\s*designated\.mu_uid/);
    expect(sql).toMatch(/tum\.owner_id\s*=\s*designated\.owner_id/);
  });

  it('AT-FC24-A-2-3: el discriminador vive en tenant_user_memberships, no en users (decisión M:N)', () => {
    expect(sql).toContain('cosmonaut_type vive en tenant_user_memberships, NO en users');
  });
});

// ─── Scenario 3: mu_user_id en tenants ────────────────────────────────────────
// Given migration 154 aplicada
// When SELECT COUNT(*) FROM tenants WHERE mu_user_id IS NULL
// Then debe ser 0 (todos los tenants tienen su MU asignado)

describe('AT-FC24-A-3: mu_user_id en tenants poblado para todos', () => {
  it('AT-FC24-A-3-1: PASO 4 agrega mu_user_id de forma idempotente', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS mu_user_id INT NULL/);
    expect(sql).toContain('ALTER TABLE tenants');
  });

  it('AT-FC24-A-3-2: backfill de mu_user_id solo toma membership con cosmonaut_type=MU', () => {
    expect(sql).toMatch(/tum\.cosmonaut_type\s*=\s*'MU'/);
    expect(sql).toMatch(/SET t\.mu_user_id = tum\.user_id/);
  });

  it('AT-FC24-A-3-3: FK fk_tenants_mu_user referencia users(id)', () => {
    expect(sql).toMatch(/fk_tenants_mu_user[\s\S]*?REFERENCES users\(id\)/);
  });
});

// ─── Scenario extra: idempotencia completa del script (PASO 6 hardened) ──────
// Confirma el fix aplicado tras el incidente de prod (#1005 Duplicate key)

describe('AT-FC24-A-4: idempotencia completa del script — PASO 6 hardened', () => {
  it('AT-FC24-A-4-1: PASO 6 valida existencia previa de la FK vía information_schema antes de crearla', () => {
    expect(sql).toMatch(/information_schema\.TABLE_CONSTRAINTS/);
    expect(sql).toContain("CONSTRAINT_NAME = 'fk_tenants_mu_user'");
  });

  it('AT-FC24-A-4-2: PASO 6 usa PREPARE/EXECUTE condicional — sin fallo en re-run', () => {
    expect(sql).toMatch(/PREPARE stmt FROM @sql/);
    expect(sql).toMatch(/EXECUTE stmt/);
    expect(sql).toMatch(/DEALLOCATE PREPARE stmt/);
  });

  it('AT-FC24-A-4-3: FK usa ON DELETE RESTRICT — preserva integridad referencial del MU', () => {
    expect(sql).toMatch(/FOREIGN KEY \(mu_user_id\) REFERENCES users\(id\) ON DELETE RESTRICT/);
  });
});

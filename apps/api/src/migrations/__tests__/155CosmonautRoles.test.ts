import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * AT-FC24-B: Migration 155 — Cosmonaut Roles Schema Validation
 * Gherkin scenarios de Fase B del FC24_Cosmonaut_Implementation
 * Estrategia: parse del SQL file — no requiere conexión a DB.
 */

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../packages/database/migrations/155_cosmonaut_roles.sql'
);

let sql: string;

beforeAll(() => {
  sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
});

// ─── Scenario 1: R_global creados con tenant_id NULL ─────────────────────────
// Given migration 155 aplicada
// When SELECT COUNT(*) FROM cosmonaut_roles WHERE tenant_id IS NULL
// Then debe retornar 4 (Mecánico · Supervisor · Operador · Auditor)

describe('AT-FC24-B-1: R_global roles seed con tenant_id NULL', () => {
  const GLOBAL_ROLES = ['Mecánico', 'Supervisor', 'Operador', 'Auditor'] as const;

  it('AT-FC24-B-1-1: migration contiene INSERT para los 4 R_global', () => {
    GLOBAL_ROLES.forEach((role) => {
      expect(sql).toContain(`'${role}'`);
    });
  });

  it('AT-FC24-B-1-2: cada INSERT R_global usa NULL como tenant_id', () => {
    GLOBAL_ROLES.forEach((role) => {
      const pattern = new RegExp(`NULL,\\s*'${role}'`);
      expect(sql).toMatch(pattern);
    });
  });

  it('AT-FC24-B-1-3: WHERE NOT EXISTS garantiza idempotencia del seed', () => {
    GLOBAL_ROLES.forEach((role) => {
      const pattern = new RegExp(
        `WHERE NOT EXISTS.*SELECT 1 FROM cosmonaut_roles WHERE tenant_id IS NULL AND name = '${role}'`,
        's'
      );
      expect(sql).toMatch(pattern);
    });
  });

  it('AT-FC24-B-1-4: exactamente 4 INSERTs de R_global en el seed', () => {
    const matches = sql.match(/INSERT INTO cosmonaut_roles/g);
    expect(matches).toHaveLength(4);
  });
});

// ─── Scenario 2: is_system=1 en R_global ─────────────────────────────────────
// Given migration 155 aplicada
// When SELECT is_system FROM cosmonaut_roles WHERE tenant_id IS NULL
// Then todos deben tener is_system=1

describe('AT-FC24-B-2: is_system=1 en todos los R_global', () => {
  it('AT-FC24-B-2-1: cada INSERT R_global incluye is_system con valor 1', () => {
    const insertBlocks = sql.split(/INSERT INTO cosmonaut_roles/).slice(1);
    expect(insertBlocks.length).toBeGreaterThanOrEqual(4);

    insertBlocks.forEach((block) => {
      const selectLine = block.split('\n').find((l) => l.trim().startsWith('SELECT'));
      expect(selectLine).toBeDefined();
      // El último valor del SELECT es is_system=1
      expect(selectLine).toMatch(/,\s*1\s*$/);
    });
  });
});

// ─── Scenario 3: tablas creadas con FKs correctos ────────────────────────────
// Given migration 155 aplicada
// Then cosmonaut_role_permissions debe referenciar permissions(id) (no permission_catalog)
// And  cosmonaut_role_assignments debe referenciar users(id), cosmonaut_roles(id), tenants(id)

describe('AT-FC24-B-3: FKs correctos en tablas de Fase B', () => {
  it('AT-FC24-B-3-1: cosmonaut_role_permissions referencia permissions(id) — NO permission_catalog', () => {
    expect(sql).toContain('REFERENCES permissions(id)');
    // La FK no debe apuntar a permission_catalog — solo aparece en comentarios explicativos
    expect(sql).not.toMatch(/REFERENCES\s+permission_catalog/);
  });

  it('AT-FC24-B-3-2: cosmonaut_role_assignments referencia users(id)', () => {
    expect(sql).toContain('REFERENCES users(id)');
  });

  it('AT-FC24-B-3-3: cosmonaut_role_assignments referencia cosmonaut_roles(id)', () => {
    expect(sql).toContain('REFERENCES cosmonaut_roles(id)');
  });

  it('AT-FC24-B-3-4: cosmonaut_role_assignments referencia tenants(id)', () => {
    expect(sql).toContain('REFERENCES tenants(id)');
  });

  it('AT-FC24-B-3-5: cosmonaut_roles tiene FK a tenants(id) para R_universe', () => {
    const crTable = sql.split('CREATE TABLE IF NOT EXISTS cosmonaut_role_permissions')[0];
    expect(crTable).toContain('REFERENCES tenants(id)');
  });
});

// ─── Scenario extra: namespaces de slugs correctos (OQ-3 AG) ─────────────────
// Garantiza que el seed use los namespaces reales de migration 150

describe('AT-FC24-B-4: slugs de permisos usan namespaces correctos (OQ-3 AG)', () => {
  it('AT-FC24-B-4-1: usa namespace maint: (no maintenance:)', () => {
    expect(sql).toContain("'maint:");
    expect(sql).not.toContain("'maintenance:");
  });

  it('AT-FC24-B-4-2: usa namespace finance: (no financial:)', () => {
    expect(sql).toContain("'finance:");
    expect(sql).not.toContain("'financial:");
  });

  it('AT-FC24-B-4-3: usa namespace fleet:', () => {
    expect(sql).toContain("'fleet:");
  });

  it('AT-FC24-B-4-4: usa namespace users:', () => {
    expect(sql).toContain("'users:");
  });

  it('AT-FC24-B-4-5: NO usa namespace reports: (no existe en migration 150)', () => {
    expect(sql).not.toContain("'reports:");
  });
});

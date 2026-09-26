import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * FC197 F1 — migración 179: `schema_migrations` + purga de las 28 tablas `zz_` + línea base.
 * Parse del SQL (sin DB), mismo patrón que `178EmailMfaSchema.test.ts`. La coincidencia de la
 * línea base con los archivos en disco la prueba `scripts/dbBaselineMigrations.test.ts`.
 */

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../packages/database/migrations/179_schema_migrations_and_orphan_backup_purge.sql'
);

/** Lista cerrada de 408_AN (Cond.R-197 P9). */
const ZZ_TABLES = [
  'zz_fc062_bak_financial_transactions',
  'zz_fc062_bak_fleet_movements',
  'zz_fc062_bak_fleet_units',
  'zz_fc062_bak_maintenance_details',
  'zz_fc062_bak_maintenance_extensions',
  'zz_fc062_bak_route_checkpoints',
  'zz_fc062_bak_route_extensions',
  'zz_fc062_bak_route_incidents',
  'zz_fc062_bak_unit_activity_logs',
  'zz_fc062_bak_upa_work_order_tasks',
  'zz_fc062_bak_upa_work_orders',
  'zz_fc062f6_bak_areas',
  'zz_fc062f6_bak_financial_transactions',
  'zz_fc062f6_bak_fleet_movements',
  'zz_fc062f6_bak_fleet_units',
  'zz_fc062f6_bak_notifications_outbox',
  'zz_fc062f6_bak_owner_specialties',
  'zz_fc062f6_bak_route_checkpoints',
  'zz_fc062f6_bak_route_extensions',
  'zz_fc062f6_bak_route_incidents',
  'zz_fc062f6_bak_tenant_profiles',
  'zz_fc062f6_bak_tenant_service_links',
  'zz_fc062f6_bak_tenant_user_memberships',
  'zz_fc062f6_bak_tenants',
  'zz_fc062f6_bak_upa_work_order_tasks',
  'zz_fc062f6_bak_upa_work_orders',
  'zz_fc062f6_bak_users',
  'zz_fc067_orphan_universe_superclusters_bak',
];

let statements: string;

beforeAll(() => {
  statements = fs
    .readFileSync(MIGRATION_PATH, 'utf8')
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
});

describe('AT-FC197-F1: schema_migrations', () => {
  it('se crea de forma idempotente, con el nombre de archivo como llave', () => {
    expect(statements).toMatch(/CREATE TABLE IF NOT EXISTS schema_migrations \(/);
    expect(statements).toMatch(/filename\s+VARCHAR\(255\) NOT NULL/);
    expect(statements).toMatch(/checksum_sha256\s+VARCHAR\(64\)\s+NOT NULL/);
    expect(statements).toMatch(/PRIMARY KEY \(filename\)/);
  });

  it('la línea base es un INSERT IGNORE con 173 filas', () => {
    expect(statements).toMatch(/INSERT IGNORE INTO schema_migrations/);
    expect(statements.match(/'FC197-baseline', 'baseline'\)/g)).toHaveLength(173);
  });
});

describe('AT-FC197-F1: purga de las 28 tablas zz_ (Ω 3b)', () => {
  const drops = (): string[] =>
    [...statements.matchAll(/DROP TABLE IF EXISTS (\w+);/g)].map((m) => m[1]);

  it('exactamente la lista cerrada, por nombre y con IF EXISTS', () => {
    expect(drops()).toEqual(ZZ_TABLES);
  });

  it('ningún DROP fuera de las zz_ ni SQL dinámico', () => {
    expect(statements.match(/\bDROP\b/gi)).toHaveLength(28);
    expect(drops().every((t) => t.startsWith('zz_'))).toBe(true);
    expect(statements).not.toMatch(/\b(PREPARE|EXECUTE)\b|CONCAT\(/i);
  });

  it('no toca filas de tablas operativas', () => {
    expect(statements).not.toMatch(/\b(UPDATE|DELETE)\b/i);
    expect(statements.match(/\bINSERT\b/gi)).toHaveLength(1);
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * FC203 F4 (C3-OBS1 · Invariante 4) — migración 182: el rol global MU recibe SOLO
 * `users:collaborator:view` (least-privilege, R 478_AN). Parse del SQL, sin DB, mismo patrón que
 * `181SecurityEventsTables.test.ts`.
 */

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../packages/database/migrations/182_V78.103.273_FC203-F4_20261003_mu_personnel_rbac.sql'
);

const STATEMENTS = fs
  .readFileSync(MIGRATION_PATH, 'utf8')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

describe('Migración 182 — Personal para el Master of Universe (FC203 F4)', () => {
  it('idempotente y solo aditiva: un INSERT IGNORE, 0 DDL ni DELETE/UPDATE', () => {
    expect(STATEMENTS.match(/INSERT IGNORE INTO cosmonaut_role_permissions/g)).toHaveLength(1);
    expect(STATEMENTS).not.toMatch(/\b(CREATE|ALTER|DROP|DELETE|UPDATE|TRUNCATE|REPLACE)\b/i);
  });

  it('otorga exactamente un permiso: users:collaborator:view', () => {
    const slugs = STATEMENTS.match(/'[a-z]+:[a-z:_-]+'/g) ?? [];
    expect(slugs).toEqual(["'users:collaborator:view'"]);
  });

  it('solo al rol global MU (tenant_id IS NULL), no a roles de un Universo', () => {
    expect(STATEMENTS).toContain('cr.tenant_id IS NULL');
    expect(STATEMENTS).toContain("cr.name = 'MU'");
  });

  it('least-privilege: ni create/edit/delete de colaboradores, ni admin:tenant, ni módulos de negocio', () => {
    expect(STATEMENTS).not.toMatch(
      /users:collaborator:(create|edit|delete)|admin:tenant|fleet:|maint:|finance:|'\*'/
    );
  });
});

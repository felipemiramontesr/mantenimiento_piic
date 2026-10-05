import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * FC204 F1 (B3-DEF2 · Invariantes 1–3) — migración 183: AUTO_INCREMENT en `common_catalogs` y
 * remediación del tenant 0 sin UPDATE de PK (R 484/485_AN). Parse del SQL, sin DB, mismo patrón que
 * `182MuPersonnelRbac.test.ts`. La corrida real (fixture con Universo 0 + control) se prueba en una base
 * desechable y en `dbMigrateLocal`; la evidencia vive en F.
 */

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../packages/database/migrations/183_V78.103.274_FC204-F1_20261005_common_catalogs_auto_increment_and_tenant_zero_fix.sql'
);

const STATEMENTS = fs
  .readFileSync(MIGRATION_PATH, 'utf8')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

/** Posición de la primera aparición; falla si no aparece. */
function at(fragment: string): number {
  const index = STATEMENTS.indexOf(fragment);
  expect(index, fragment).toBeGreaterThanOrEqual(0);
  return index;
}

/** Lista sellable (information_schema, local = prod por huella): columnas dependientes del id del Universo. */
const DEPENDENTS: ReadonlyArray<readonly [string, string]> = [
  ['administrative_audit_logs', 'owner_id'],
  ['areas', 'owner_id'],
  ['cosmonaut_roles', 'tenant_id'],
  ['cosmonaut_role_assignments', 'tenant_id'],
  ['owner_specialties', 'owner_id'],
  ['social_posts', 'owner_id'],
  ['social_reviews', 'taller_owner_id'],
  ['tenants', 'parent_owner_id'],
  ['tenant_profiles', 'owner_id'],
  ['tenant_service_links', 'centro_owner_id'],
  ['tenant_service_links', 'privado_owner_id'],
  ['tenant_user_memberships', 'owner_id'],
  ['universe_clusters', 'tenant_id'],
  ['universe_superclusters', 'tenant_id'],
  ['universe_lattices', 'u1_tenant_id'],
  ['universe_lattices', 'u2_tenant_id'],
  ['user_fleet_owners', 'owner_id'],
  ['fleet_units', 'ownerId'],
  ['common_catalogs', 'parent_id'],
];

describe('Migración 183 — AUTO_INCREMENT y remediación del tenant 0 (FC204 F1)', () => {
  it('nunca hace UPDATE de la PK (las FK son ON UPDATE RESTRICT)', () => {
    expect(STATEMENTS).not.toMatch(/\bSET\s+id\s*=/i);
  });

  it('repunta de 0 a NEW_ID cada columna dependiente de la lista sellable', () => {
    DEPENDENTS.forEach(([table, column]) => {
      expect(STATEMENTS).toContain(
        `UPDATE ${table} SET ${column} = @fc204_new_id WHERE ${column} = 0 AND @fc204_has_zero > 0;`
      );
    });
  });

  it('orden 485_AN: copiar → repuntar → asertar → borrar el 0 → COMMIT → ALTER', () => {
    const copy = at('INSERT INTO tenants');
    const repoint = at('UPDATE administrative_audit_logs');
    const assertion = at('EXECUTE fc204_stmt');
    const deletion = at('DELETE FROM tenants WHERE id = 0');
    const commit = at('COMMIT;');
    const alter = at(
      'ALTER TABLE common_catalogs MODIFY COLUMN id INT(11) NOT NULL AUTO_INCREMENT'
    );
    expect(at('START TRANSACTION')).toBeLessThan(copy);
    expect(at('INSERT INTO common_catalogs')).toBeLessThan(repoint);
    expect(copy).toBeLessThan(repoint);
    expect(repoint).toBeLessThan(assertion);
    expect(assertion).toBeLessThan(deletion);
    expect(at('DELETE FROM common_catalogs WHERE id = 0')).toBeLessThan(commit);
    expect(commit).toBeLessThan(alter);
  });

  it('la aserción cuenta cada columna dependiente y las FK de negocio a common_catalogs', () => {
    const assertion = STATEMENTS.slice(at('SET @fc204_refs'), at('SET @fc204_assert'));
    DEPENDENTS.forEach(([table, column]) => {
      expect(assertion).toMatch(new RegExp(`FROM ${table} WHERE [^)]*\\b${column} = 0`));
    });
    [
      'financial_transactions',
      'fleet_maintenance_extensions',
      'fleet_maintenance_logs',
      'route_incidents',
    ].forEach((table) => expect(assertion).toContain(`FROM ${table} WHERE`));
    expect(assertion).toContain('catalog_id = 0');
  });

  it('fail-closed: con referencias restantes ejecuta una consulta que falla (el cliente aborta sin COMMIT)', () => {
    expect(STATEMENTS).toContain(
      "IF(@fc204_refs = 0, 'DO 0', 'SELECT 1 FROM fc204_assertion_failed_references_to_zero_remain')"
    );
  });

  it('la copia del tenant usa handle temporal (UNIQUE) y recupera el original tras el DELETE', () => {
    expect(STATEMENTS).toContain("CONCAT('FC204-', @fc204_new_id)");
    expect(at('DELETE FROM tenants WHERE id = 0')).toBeLessThan(
      at('UPDATE tenants SET handle = @fc204_handle WHERE id = @fc204_new_id')
    );
  });

  it('NEW_ID supera todo id vivo y no toca el esquema de tenants (diseño 107)', () => {
    expect(STATEMENTS).toMatch(
      /GREATEST\([\s\S]*FROM common_catalogs[\s\S]*FROM tenants[\s\S]*FROM fleet_units[\s\S]*\) \+ 1/
    );
    expect(STATEMENTS).not.toMatch(/ALTER TABLE tenants/i);
    expect(STATEMENTS.match(/ALTER TABLE/gi)).toHaveLength(1);
  });
});

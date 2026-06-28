import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * AT-FC18-D1: Granular Permission Engine — Migration 150 Validation
 * Verifies that the SQL migration file is structurally complete per FC-18 FaseD-1.
 * These are file-content tests — no DB connection required.
 */

/* eslint-disable no-underscore-dangle */
const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
/* eslint-enable no-underscore-dangle */

const SQL_PATH = resolve(
  __dir,
  '../../../../packages/database/migrations/150_granular_permission_engine.sql'
);

describe('FC-18 FaseD-1 — Permission Engine Migration (AT-FC18-D1)', () => {
  let sql: string;

  beforeAll(() => {
    sql = readFileSync(SQL_PATH, 'utf-8');
  });

  // AT-FC18-D1-DB-1: 141 permisos atómicos definidos en el seed
  it('AT-FC18-D1-DB-1 — SQL contiene >= 141 slugs de permisos atómicos', () => {
    // Each permission slug line follows pattern: ('slug', 'description'),
    const slugLines = sql.match(/\('[a-z][a-z0-9:_-]+:[a-z][a-z0-9:_-]+',\s*'/g);
    expect(slugLines?.length ?? 0).toBeGreaterThanOrEqual(141);
  });

  // AT-FC18-D1-DB-2: fleet:unit:field:vin:decrypt en seeds y asignado a role 4
  it('AT-FC18-D1-DB-2 — fleet:unit:field:vin:decrypt definido Y asignado a role 4 (Gestor Flotilla)', () => {
    expect(sql).toContain("'fleet:unit:field:vin:decrypt'");
    const role4Block = sql.match(/ROLE 4[\s\S]*?SELECT 4,[\s\S]*?;/)?.[0] ?? '';
    expect(role4Block).toContain('fleet:unit:field:vin:decrypt');
  });

  // AT-FC18-D1-DB-3: fleet:unit:field:vin:decrypt NO en role 10 (Operador/Familiar)
  it('AT-FC18-D1-DB-3 — fleet:unit:field:vin:decrypt NO asignado a role 10 (Operador/Familiar)', () => {
    const role10Block = sql.match(/ROLE 10[\s\S]*?SELECT 10,[\s\S]*?;/)?.[0] ?? '';
    expect(role10Block).not.toContain('fleet:unit:field:vin:decrypt');
  });

  // AT-FC18-D1-DB-4: role 9 (Cliente Externo) solo portal:* y notifications:*
  it('AT-FC18-D1-DB-4 — role 9 (Cliente Externo) tiene exclusivamente portal:* y notifications:*', () => {
    const role9Block = sql.match(/ROLE 9[\s\S]*?SELECT 9,[\s\S]*?;/)?.[0] ?? '';
    const slugMatches = [...role9Block.matchAll(/'([a-z][a-z0-9:_-]{2,})'/g)];
    const permSlugs = slugMatches
      .map((m) => m[1])
      .filter((s) => s.includes(':') && !s.startsWith('role_permissions'));
    expect(permSlugs.length).toBeGreaterThan(0);
    permSlugs.forEach((slug) => {
      expect(slug.startsWith('portal:') || slug.startsWith('notifications:')).toBe(true);
    });
  });

  // AT-FC18-D1-DB-5: roles 9 y 10 creados
  it('AT-FC18-D1-DB-5 — roles 9 (Cliente Externo) y 10 (Operador/Familiar) insertados', () => {
    expect(sql).toContain("(9,  'Cliente Externo'");
    expect(sql).toContain("(10, 'Operador / Familiar'");
  });

  // AT-FC18-D1-DB-6: permisos de document (AG Q6) presentes
  it('AT-FC18-D1-DB-6 — module document incluye file:upload y file:download (AG Q6)', () => {
    expect(sql).toContain("'document:file:upload'");
    expect(sql).toContain("'document:file:download'");
  });

  // AT-FC18-D1-DB-7: módulos críticos de AES sensibles definidos
  it('AT-FC18-D1-DB-7 — los 3 campos AES sensibles tienen permisos de decrypt independientes', () => {
    expect(sql).toContain("'fleet:unit:field:vin:decrypt'");
    expect(sql).toContain("'fleet:unit:field:plates:decrypt'");
    expect(sql).toContain("'fleet:unit:field:circcard:decrypt'");
  });

  // AT-FC18-D1-DB-8: portalfleet:view:own NO contiene decrypt (invariante de seguridad)
  it('AT-FC18-D1-DB-8 — portal:fleet:view:own no implica decrypt (seguridad AES)', () => {
    const role9Block = sql.match(/ROLE 9[\s\S]*?SELECT 9,[\s\S]*?;/)?.[0] ?? '';
    expect(role9Block).not.toContain('fleet:unit:field:vin:decrypt');
    expect(role9Block).not.toContain('fleet:unit:field:plates:decrypt');
    expect(role9Block).not.toContain('fleet:unit:field:circcard:decrypt');
  });

  // AT-FC18-D1-DB-9: INSERT IGNORE garantiza idempotencia (no se usa INSERT sin IGNORE)
  it('AT-FC18-D1-DB-9 — todos los INSERTs de permisos son IGNORE (idempotencia)', () => {
    const insertLines = sql.match(/^INSERT\s+INTO\s+(?!IGNORE)/gim);
    expect(insertLines ?? []).toHaveLength(0);
  });

  // AT-FC18-D1-DB-10: crm:export presente (AG Q6)
  it('AT-FC18-D1-DB-10 — crm:export definido (AG Q6 — exportación CRM)', () => {
    expect(sql).toContain("'crm:export'");
  });
});

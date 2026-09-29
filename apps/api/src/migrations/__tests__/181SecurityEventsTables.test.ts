import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * FC201 F1 — migración 181: `security_events` (agregada) y `security_manual_denylist`. Parse del
 * SQL (sin DB), mismo patrón que `180AuthSecurityTables.test.ts`.
 */

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../packages/database/migrations/181_V78.103.258_FC201-F1_20260929_security_events_and_denylist_tables.sql'
);

const STATEMENTS = fs
  .readFileSync(MIGRATION_PATH, 'utf8')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

/** Cuerpo del CREATE TABLE de `table` (entre sus paréntesis). */
function tableBody(table: string): string {
  const match = new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\) ENGINE`).exec(
    STATEMENTS
  );
  expect(match).not.toBeNull();
  return match?.[1] ?? '';
}

describe('Migración 181 — eventos de seguridad y lista de bloqueo manual (FC201 F1)', () => {
  it('idempotente y solo aditiva: 2 CREATE TABLE IF NOT EXISTS, 0 DROP/DELETE/UPDATE/ALTER', () => {
    expect(STATEMENTS.match(/CREATE TABLE IF NOT EXISTS/g)).toHaveLength(2);
    expect(STATEMENTS).not.toMatch(/\b(DROP|DELETE|UPDATE|ALTER|TRUNCATE)\b/i);
  });

  it('Inv-2 (B1): la llave única agrega por carnada del catálogo, no por la ruta pedida', () => {
    const body = tableBody('security_events');

    expect(body).toContain(
      'UNIQUE KEY uq_threat_bucket (event_type, ip_hash, window_hour, target_pattern)'
    );
    expect(body).toContain('sample_path VARCHAR(255) NULL');
    expect(body).not.toMatch(/UNIQUE KEY[^\n]*sample_path/);
  });

  it('P3: IP en HMAC obligatoria e IP en claro opcional (se vacía a los 15 días)', () => {
    const body = tableBody('security_events');

    expect(body).toContain('ip_hash CHAR(64) NOT NULL');
    expect(body).toContain('ip_address VARCHAR(45) NULL');
    expect(body).toContain('INDEX idx_retention_clear (created_at, ip_address)');
  });

  it('P4: la lista de bloqueo manual tiene tabla propia, con vencimiento y revocación', () => {
    const body = tableBody('security_manual_denylist');

    expect(body).toContain('PRIMARY KEY (ip_hash)');
    expect(body).toContain('expires_at DATETIME NOT NULL');
    expect(body).toContain('revoked_at DATETIME NULL');
  });

  it('paridad 10.4↔11.8: todo TIMESTAMP con NOT NULL y DEFAULT explícitos, 0 ON UPDATE', () => {
    const timestamps = STATEMENTS.match(/^\s*\w+ TIMESTAMP[^,\n]*/gm) ?? [];

    expect(timestamps).toHaveLength(2);
    timestamps.forEach((column) =>
      expect(column).toContain('TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP')
    );
    expect(STATEMENTS).not.toMatch(/ON UPDATE/i);
  });
});

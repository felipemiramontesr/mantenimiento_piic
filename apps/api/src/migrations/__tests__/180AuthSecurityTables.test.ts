import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * FC199 F2 — migración 180: `auth_throttle_counters`, `auth_challenge_nonces` y
 * `users.signup_source`. Parse del SQL (sin DB), mismo patrón que `179SchemaMigrations.test.ts`.
 * La aplicación real se verificó en local (dos corridas, huella igual) y en prod por el workflow.
 */

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../packages/database/migrations/180_V78.103.248_FC199-F2_20260926_auth_security_tables.sql'
);

const SQL = fs.readFileSync(MIGRATION_PATH, 'utf8');
const STATEMENTS = SQL.split('\n')
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

describe('Migración 180 — tablas de seguridad de autenticación (FC199 F2)', () => {
  it('idempotente: tablas y columna con IF NOT EXISTS', () => {
    expect(STATEMENTS.match(/CREATE TABLE IF NOT EXISTS/g)).toHaveLength(2);
    expect(STATEMENTS).toContain('ADD COLUMN IF NOT EXISTS signup_source');
  });

  it('auth_throttle_counters: llave HMAC de 64, contador y ventana', () => {
    const body = tableBody('auth_throttle_counters');

    expect(body).toContain('key_hash CHAR(64) NOT NULL');
    expect(body).toContain('counter INT UNSIGNED NOT NULL DEFAULT 1');
    expect(body).toContain('PRIMARY KEY (key_hash)');
    expect(body).toContain('INDEX idx_throttle_last_attempt (last_attempt_at)');
  });

  it('auth_challenge_nonces: un solo uso por hash y caducidad indexada', () => {
    const body = tableBody('auth_challenge_nonces');

    expect(body).toContain('nonce_hash CHAR(64) NOT NULL');
    expect(body).toContain('expires_at DATETIME NOT NULL');
    expect(body).toContain('PRIMARY KEY (nonce_hash)');
    expect(body).toContain('INDEX idx_nonce_expiry (expires_at)');
  });

  it('paridad 10.4↔11.8: todo TIMESTAMP con DEFAULT explícito y ninguno con ON UPDATE implícito', () => {
    const timestamps = STATEMENTS.match(/^\s*\w+ TIMESTAMP[^,\n]*/gm) ?? [];

    expect(timestamps).toHaveLength(3);
    timestamps.forEach((column) => expect(column).toContain('DEFAULT CURRENT_TIMESTAMP'));
    expect(STATEMENTS).not.toMatch(/ON UPDATE/i);
  });

  it('signup_source: las cuentas existentes quedan admin (la purga de F4 solo mira public)', () => {
    expect(STATEMENTS).toContain("signup_source ENUM('admin','public') NOT NULL DEFAULT 'admin'");
  });

  it('solo aditiva: 0 DROP, 0 DELETE, 0 UPDATE de datos', () => {
    expect(STATEMENTS).not.toMatch(/\b(DROP|DELETE|UPDATE users|TRUNCATE)\b/i);
  });
});

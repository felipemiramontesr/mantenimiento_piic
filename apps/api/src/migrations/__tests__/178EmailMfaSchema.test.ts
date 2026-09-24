import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * FC195 F1 — Email_Second_Factor_And_Universal_2FA_Rollout. Migration 178: correo verificado,
 * credencial 'email' y columnas del reto por correo. Estrategia: parse del SQL file — no requiere
 * conexión a DB (mismo patrón que `175TenantProfilesFiscalFields.test.ts`).
 */

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../packages/database/migrations/178_email_mfa_schema_and_verification.sql'
);

let sql: string;
let statements: string;

beforeAll(() => {
  sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  statements = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
});

describe('AT-FC195-F1-Schema: users.email_verified_at (absorbe FC187 F2/F5, D-Ω8)', () => {
  it('agrega email_verified_at NULL-able de forma idempotente, después de email', () => {
    expect(statements).toMatch(
      /ALTER TABLE users\s+ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL DEFAULT NULL AFTER email;/
    );
  });
});

describe('AT-FC195-F1-Schema: user_mfa_credentials acepta el método email', () => {
  it("agrega 'email' al ENUM conservando 'totp' y 'webauthn' y el default 'totp'", () => {
    expect(statements).toMatch(
      /MODIFY COLUMN type ENUM\('totp', 'webauthn', 'email'\) NOT NULL DEFAULT 'totp'/
    );
  });

  it('secret_encrypted pasa a NULL-able: una credencial email no tiene secreto', () => {
    expect(statements).toMatch(/MODIFY COLUMN secret_encrypted VARCHAR\(255\) NULL DEFAULT NULL/);
  });
});

describe('AT-FC195-F1-Schema: mfa_challenges con canal y código por correo', () => {
  it.each([
    ["channel ENUM\\('totp', 'email'\\) NOT NULL DEFAULT 'totp' AFTER user_id"],
    ['code_hash VARCHAR\\(255\\) NULL DEFAULT NULL AFTER channel'],
    ['expires_at TIMESTAMP NULL DEFAULT NULL AFTER code_hash'],
    ['resend_count INT NOT NULL DEFAULT 0 AFTER expires_at'],
    ['last_sent_at TIMESTAMP NULL DEFAULT NULL AFTER resend_count'],
  ])('ADD COLUMN IF NOT EXISTS %s', (definition) => {
    expect(statements).toMatch(new RegExp(`ADD COLUMN IF NOT EXISTS ${definition}`));
  });

  it("los retos existentes quedan como canal 'totp' (default), sin código ni expiración", () => {
    expect(statements).not.toMatch(/UPDATE\s+mfa_challenges/i);
    expect(statements).not.toMatch(/channel ENUM\([^)]*\) NULL/);
  });
});

describe('AT-FC195-F1-Schema: solo aditiva (Cond.R-195 R1)', () => {
  it('no borra ni recrea tablas ni columnas, y no toca filas', () => {
    expect(statements).not.toMatch(/\bDROP\b/i);
    expect(statements).not.toMatch(/CREATE TABLE/i);
    expect(statements).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/i);
  });

  it('toda columna nueva es idempotente (ADD COLUMN IF NOT EXISTS)', () => {
    const adds = statements.match(/ADD COLUMN\b(?! IF NOT EXISTS)/g) ?? [];
    expect(adds).toHaveLength(0);
  });

  it('no guarda códigos en texto plano: solo existe code_hash, no una columna code', () => {
    expect(statements).not.toMatch(/ADD COLUMN IF NOT EXISTS code\s/);
  });
});

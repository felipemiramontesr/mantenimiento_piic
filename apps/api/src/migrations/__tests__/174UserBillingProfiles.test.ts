import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * FC177 F1 — Login_Hard_Gate_And_Billing_Schema. Migration 174: `user_billing_profiles`.
 * Estrategia: parse del SQL file — no requiere conexión a DB (mismo patrón que
 * `154CosmonautType.test.ts`).
 */

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../packages/database/migrations/174_user_billing_profiles.sql'
);

let sql: string;

beforeAll(() => {
  sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
});

describe('AT-FC177-F1-Schema: user_billing_profiles', () => {
  it('crea la tabla de forma idempotente (CREATE TABLE IF NOT EXISTS)', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS user_billing_profiles');
  });

  it('user_id es PK y FK a users(id) ON DELETE CASCADE — coincide con users.id (INT signed, no UNSIGNED)', () => {
    expect(sql).toMatch(/user_id\s+INT\s+NOT NULL/);
    expect(sql).not.toMatch(/user_id\s+INT\s+UNSIGNED/);
    expect(sql).toMatch(/PRIMARY KEY \(user_id\)/);
    expect(sql).toMatch(/FOREIGN KEY \(user_id\) REFERENCES users\(id\) ON DELETE CASCADE/);
  });

  it('campos CFDI 4.0 requeridos por el receptor están presentes y son NOT NULL (310_AN §6.1)', () => {
    expect(sql).toMatch(/rfc\s+VARCHAR\(13\)\s+NOT NULL/);
    expect(sql).toMatch(/razon_social\s+VARCHAR\(255\)\s+NOT NULL/);
    expect(sql).toMatch(/regimen_fiscal\s+VARCHAR\(10\)\s+NOT NULL/);
    expect(sql).toMatch(/codigo_postal_fiscal\s+VARCHAR\(10\)\s+NOT NULL/);
  });

  it("uso_cfdi tiene default documentado 'S01' (sin efectos fiscales) — Cond.R-177 R5", () => {
    expect(sql).toMatch(/uso_cfdi\s+VARCHAR\(10\)\s+NOT NULL DEFAULT 'S01'/);
  });

  it('telefono es opcional (NULL) — no forma parte del match exacto contra la Constancia SAT', () => {
    expect(sql).toMatch(/telefono\s+VARCHAR\(20\)\s+NULL/);
  });
});

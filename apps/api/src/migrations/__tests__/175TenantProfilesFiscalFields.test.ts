import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * FC177 F3 — Cosmology_Universe_User_Linking_Backend. Migration 175: adds `regimen_fiscal`
 * and `uso_cfdi` to `tenant_profiles`. Estrategia: parse del SQL file — no requiere conexión
 * a DB (mismo patrón que `154CosmonautType.test.ts`/`174UserBillingProfiles.test.ts`).
 */

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../packages/database/migrations/175_tenant_profiles_fiscal_fields.sql'
);

let sql: string;

beforeAll(() => {
  sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
});

describe('AT-FC177-F3-Schema: tenant_profiles fiscal fields', () => {
  it('agrega regimen_fiscal de forma idempotente (ADD COLUMN IF NOT EXISTS)', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS regimen_fiscal VARCHAR\(10\) NULL/);
  });

  it('agrega uso_cfdi de forma idempotente, después de regimen_fiscal', () => {
    expect(sql).toMatch(
      /ADD COLUMN IF NOT EXISTS uso_cfdi VARCHAR\(10\) NULL AFTER regimen_fiscal/
    );
  });

  it('ambas columnas son NULLABLE — mismo criterio que el resto de campos fiscales de tenant_profiles', () => {
    expect(sql).not.toMatch(/regimen_fiscal VARCHAR\(10\) NOT NULL/);
    expect(sql).not.toMatch(/uso_cfdi VARCHAR\(10\) NOT NULL/);
  });

  it('opera sobre tenant_profiles, no sobre user_billing_profiles', () => {
    expect(sql).toMatch(/ALTER TABLE tenant_profiles/);
  });
});

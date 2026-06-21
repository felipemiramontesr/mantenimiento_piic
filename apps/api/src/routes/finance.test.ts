/* eslint-disable */
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { computePeriod, buildCsvRow, FINANCE_CATEGORY_ENUM } from './finance';

// ─── computePeriod ────────────────────────────────────────────────────────────

describe('computePeriod', () => {
  it('returns YYYY-MM format for a mid-month date', () => {
    expect(computePeriod(new Date('2025-05-15'))).toBe('2025-05');
  });

  it('pads single-digit months with leading zero', () => {
    expect(computePeriod(new Date('2025-03-01'))).toBe('2025-03');
  });

  it('handles January correctly', () => {
    expect(computePeriod(new Date('2025-01-01'))).toBe('2025-01');
  });

  it('handles December correctly', () => {
    expect(computePeriod(new Date('2025-12-31'))).toBe('2025-12');
  });

  it('handles year boundary at Dec 31', () => {
    expect(computePeriod(new Date('2024-12-31'))).toBe('2024-12');
  });

  it('handles year boundary at Jan 1', () => {
    expect(computePeriod(new Date('2026-01-01'))).toBe('2026-01');
  });
});

// ─── buildCsvRow ──────────────────────────────────────────────────────────────

describe('buildCsvRow', () => {
  const baseTx = {
    uuid: 'abc-123',
    unit_name: 'ASM-001',
    category: 'MAINTENANCE',
    amount: 1500.5,
    period: '2025-05',
    vendor: 'Taller Central',
    invoice_ref: 'FAC-001',
    notes: 'Cambio de aceite y filtros',
    created_by_name: 'Juan Pérez',
    created_at: '2025-05-10',
  };

  it('contains all core fields', () => {
    const row = buildCsvRow(baseTx);
    expect(row).toContain('abc-123');
    expect(row).toContain('ASM-001');
    expect(row).toContain('MAINTENANCE');
    expect(row).toContain('1500.5');
    expect(row).toContain('2025-05');
    expect(row).toContain('FAC-001');
  });

  it('escapes commas inside text fields with double-quotes', () => {
    const tx = { ...baseTx, vendor: 'Proveedor, S.A. de C.V.' };
    const row = buildCsvRow(tx);
    expect(row).toContain('"Proveedor, S.A. de C.V."');
  });

  it('escapes double-quotes inside text fields', () => {
    const tx = { ...baseTx, notes: 'Cambio "urgente" de aceite' };
    const row = buildCsvRow(tx);
    expect(row).toContain('"Cambio ""urgente"" de aceite"');
  });

  it('handles null vendor without throwing', () => {
    const tx = { ...baseTx, vendor: null, invoice_ref: null, notes: null };
    expect(() => buildCsvRow(tx)).not.toThrow();
  });

  it('renders empty string for null fields', () => {
    const tx = { ...baseTx, vendor: null, invoice_ref: null, notes: null };
    const row = buildCsvRow(tx);
    const parts = row.split(',');
    // vendor, invoice_ref, notes are fields 5,6,7 (0-indexed)
    expect(parts[5]).toBe('');
    expect(parts[6]).toBe('');
    expect(parts[7]).toBe('');
  });

  it('produces exactly 10 comma-separated fields', () => {
    const row = buildCsvRow(baseTx);
    // Simple count — no embedded commas in baseTx vendor field
    expect(row.split(',').length).toBe(10);
  });

  it('handles zero amount', () => {
    const tx = { ...baseTx, amount: 0 };
    const row = buildCsvRow(tx);
    expect(row).toContain('0');
  });
});

// ─── FT-VIM-1..2: VIM Category ENUM (FC-3 Fase 3A) ──────────────────────────

describe('FINANCE_CATEGORY_ENUM — VIM categories', () => {
  it('FT-VIM-1: includes TENENCIA for Mexican vehicle tax expenses', () => {
    expect(FINANCE_CATEGORY_ENUM).toContain('TENENCIA');
  });

  it('FT-VIM-2: includes VERIFICACION for Mexican vehicle inspection expenses', () => {
    expect(FINANCE_CATEGORY_ENUM).toContain('VERIFICACION');
  });

  it('FT-VIM-3: preserves all pre-existing ERP categories', () => {
    const erpCategories = [
      'LEASE',
      'INSURANCE',
      'MAINTENANCE',
      'FUEL',
      'TIRE',
      'FINE',
      'REPAIR',
      'OTHER',
    ];
    erpCategories.forEach((cat) => {
      expect(FINANCE_CATEGORY_ENUM).toContain(cat);
    });
  });
});

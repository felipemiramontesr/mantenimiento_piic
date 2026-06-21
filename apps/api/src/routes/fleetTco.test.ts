/* eslint-disable */
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { buildTcoResponse } from './fleetTco';
import type { TcoRow } from './fleetTco';

// FT-TCO-1..2: GET /fleet-units/:unitId/tco — pure helper unit tests (FC-3 Fase 3D)

const baseTcoRow: TcoRow = {
  fleet_unit_id: 'PIIC-101',
  owner_id: 9100,
  suite: 'VIM',
  tco_total: '4200.00',
  tco_maintenance: '1000.00',
  tco_insurance: '1200.00',
  tco_lease: '0.00',
  tco_tenencia: '3200.00',
  tco_verificacion: '500.00',
  tco_fuel: '800.00',
  tco_other: '0.00',
  total_records: '5',
  last_record_at: '2026-06-15T10:00:00.000Z',
};

describe('buildTcoResponse (FT-TCO-1..2)', () => {
  it('FT-TCO-1: convierte todos los campos DECIMAL a number y preserva fleet_unit_id y suite', () => {
    const result = buildTcoResponse(baseTcoRow);
    expect(result.fleet_unit_id).toBe('PIIC-101');
    expect(result.suite).toBe('VIM');
    expect(result.tco_total).toBe(4200);
    expect(result.tco_maintenance).toBe(1000);
    expect(result.tco_insurance).toBe(1200);
    expect(result.tco_tenencia).toBe(3200);
    expect(result.tco_verificacion).toBe(500);
    expect(result.tco_fuel).toBe(800);
    expect(result.tco_other).toBe(0);
    expect(result.total_records).toBe(5);
  });

  it('FT-TCO-2: maneja last_record_at null sin lanzar excepción', () => {
    const row: TcoRow = { ...baseTcoRow, last_record_at: null };
    const result = buildTcoResponse(row);
    expect(result.last_record_at).toBeNull();
  });

  it('FT-TCO-3: no incluye owner_id en la respuesta (no exponer FK interno)', () => {
    const result = buildTcoResponse(baseTcoRow);
    expect(result).not.toHaveProperty('owner_id');
  });

  it('FT-TCO-4: unidad sin transacciones devuelve tco_total = 0', () => {
    const emptyRow: TcoRow = {
      ...baseTcoRow,
      tco_total: '0.00',
      tco_maintenance: '0.00',
      tco_insurance: '0.00',
      tco_lease: '0.00',
      tco_tenencia: '0.00',
      tco_verificacion: '0.00',
      tco_fuel: '0.00',
      tco_other: '0.00',
      total_records: '0',
      last_record_at: null,
    };
    const result = buildTcoResponse(emptyRow);
    expect(result.tco_total).toBe(0);
    expect(result.total_records).toBe(0);
    expect(result.last_record_at).toBeNull();
  });
});

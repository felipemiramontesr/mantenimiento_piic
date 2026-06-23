import { describe, it, expect } from 'vitest';
import {
  SEED_C_TAG,
  RECALL_CATALOG,
  UNIT_RECALL_ASSIGNMENTS,
  PIIC202_COMPLIANCE,
} from './seedCData';

// ─── FC DataResilience_NHTSAIntegration — FaseC Tests ────────────────────────
// SEED-C-1: PIIC-101 tiene 3 recalls PENDING (triple recall EC-2)
// SEED-C-2: PIIC-202 compliance dates > hoy (2026-06-22)
// SEED-C-3: cleanup puede identificar todas las asignaciones SEED_C

const TODAY = '2026-06-22';

describe('DataResilience FaseC — Recalls & Compliance data integrity', () => {
  it('SEED-C-1: PIIC-101 tiene exactamente 3 recalls todos con status PENDING', () => {
    const piic101 = UNIT_RECALL_ASSIGNMENTS.filter((a) => a.unitId === 'PIIC-101');
    expect(piic101).toHaveLength(3);
    piic101.forEach((a) => {
      expect(a.status).toBe('PENDING');
    });
  });

  it('SEED-C-2: PIIC-202 insuranceExpiryDate > hoy (EC-1 perfect compliance)', () => {
    expect(PIIC202_COMPLIANCE.insuranceExpiryDate > TODAY).toBe(true);
  });

  it('SEED-C-2: PIIC-202 vencimientoVerificacion > hoy (EC-1 perfect compliance)', () => {
    expect(PIIC202_COMPLIANCE.vencimientoVerificacion > TODAY).toBe(true);
  });

  it('SEED-C-3: catalog_recalls tiene exactamente 6 campañas', () => {
    expect(RECALL_CATALOG).toHaveLength(6);
  });

  it('SEED-C-4: todos los campaign_codes son únicos', () => {
    const codes = RECALL_CATALOG.map((r) => r.campaignCode);
    expect(new Set(codes).size).toBe(RECALL_CATALOG.length);
  });

  it('SEED-C-5: todos los campaign_codes usan prefijo SEED_C_TAG para cleanup', () => {
    RECALL_CATALOG.forEach((r) => {
      expect(r.campaignCode.startsWith(SEED_C_TAG)).toBe(true);
    });
  });

  it('SEED-C-6: PIIC-202 tiene 1 PENDING + 1 COMPLETED (EC-1 parcial compliance)', () => {
    const piic202 = UNIT_RECALL_ASSIGNMENTS.filter((a) => a.unitId === 'PIIC-202');
    expect(piic202).toHaveLength(2);
    expect(piic202.filter((a) => a.status === 'PENDING')).toHaveLength(1);
    expect(piic202.filter((a) => a.status === 'COMPLETED')).toHaveLength(1);
  });

  it('SEED-C-7: PIIC-202 COMPLETED tiene resolvedAt definido', () => {
    const completed = UNIT_RECALL_ASSIGNMENTS.find(
      (a) => a.unitId === 'PIIC-202' && a.status === 'COMPLETED'
    );
    expect(completed).toBeDefined();
    expect(completed?.resolvedAt).toBeDefined();
  });

  it('SEED-C-8: PIIC-303 EC-1 tiene 1 recall PENDING (overlap con MAINTENANCE)', () => {
    const piic303 = UNIT_RECALL_ASSIGNMENTS.filter((a) => a.unitId === 'PIIC-303');
    expect(piic303).toHaveLength(1);
    expect(piic303[0].status).toBe('PENDING');
    expect(piic303[0].campaignCode).toBe('DC-NP300-2020-A');
  });

  it('SEED-C-9: recall DC-NP300-2020-A afecta año 2020 (mismo año PIIC-303)', () => {
    const recall = RECALL_CATALOG.find((r) => r.campaignCode === 'DC-NP300-2020-A');
    expect(recall?.year).toBe(2020);
    expect(recall?.make).toBe('NISSAN');
  });

  it('SEED-C-10: total de asignaciones = 6 (3 PIIC-101 + 2 PIIC-202 + 1 PIIC-303)', () => {
    expect(UNIT_RECALL_ASSIGNMENTS).toHaveLength(6);
  });

  it('SEED-C-11: PIIC-101 recalls son solo Nissan NP300 2021', () => {
    const piic101Codes = UNIT_RECALL_ASSIGNMENTS.filter((a) => a.unitId === 'PIIC-101').map(
      (a) => a.campaignCode
    );
    piic101Codes.forEach((code) => {
      const recall = RECALL_CATALOG.find((r) => r.campaignCode === code);
      expect(recall?.make).toBe('NISSAN');
      expect(recall?.year).toBe(2021);
    });
  });

  it('SEED-C-12: SEED_C_TAG está definido como "DC-"', () => {
    expect(SEED_C_TAG).toBe('DC-');
  });
});

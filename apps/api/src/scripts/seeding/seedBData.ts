/**
 * FaseB seeding data definitions — FC DataResilience_NHTSAIntegration
 * Exported separately so tests can import without DB/env dependencies.
 */

export const SEED_B_TAG = 'SEED_B';

export type FinancialCategory =
  | 'LEASE'
  | 'INSURANCE'
  | 'MAINTENANCE'
  | 'FUEL'
  | 'TIRE'
  | 'REPAIR'
  | 'OTHER';
export type IncidentCategory = 'MECANICA' | 'SINIESTRO' | 'LEGAL' | 'OPERATIVA' | 'OTRA';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FinancialEntry {
  category: FinancialCategory;
  amount: number;
  period: string; // YYYY-MM
  vendor?: string;
  notes: string;
}

export interface IncidentSpec {
  routeIndex: number;
  category: IncidentCategory;
  description: string;
  severity: IncidentSeverity;
}

export interface UnitBSeeding {
  unitId: string;
  transactions: FinancialEntry[];
  incidents: IncidentSpec[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const MONTHS_12: string[] = Array.from({ length: 12 }, (_, i) => {
  const d = new Date('2025-06-01');
  d.setMonth(d.getMonth() + i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});
// ['2025-06', '2025-07', ..., '2026-05']

function lease(months: string[], amount: number): FinancialEntry[] {
  return months.map(
    (period): FinancialEntry => ({
      category: 'LEASE',
      amount,
      period,
      vendor: 'Arrendadora Sigma SA de CV',
      notes: SEED_B_TAG,
    })
  );
}

function tx(
  category: FinancialCategory,
  amount: number,
  period: string,
  vendor?: string
): FinancialEntry {
  return { category, amount, period, vendor, notes: SEED_B_TAG };
}

function fuelMonthly(months: string[], amount: number): FinancialEntry[] {
  return months.map((period): FinancialEntry => tx('FUEL', amount, period));
}

// ─── PIIC-101 ────────────────────────────────────────────────────────────────
// EC-3: julio 2025 incidents en indices 4-8 (rutas en días 30,36,42,48,54)
// TCO: 54,000+18,000+24,000+7,000+8,000+5,000 = 116,000 → REPLACE (score 1.29)
export const PIIC101_TRANSACTIONS: FinancialEntry[] = [
  ...lease(MONTHS_12, 4_500),
  tx('INSURANCE', 18_000, '2025-07', 'Qualitas'),
  ...fuelMonthly(MONTHS_12, 2_000),
  tx('MAINTENANCE', 3_500, '2025-09', 'Taller NP300'),
  tx('MAINTENANCE', 3_500, '2026-01', 'Taller NP300'),
  tx('TIRE', 8_000, '2025-10', 'Llantas Vianney'),
  tx('REPAIR', 5_000, '2026-03', 'Taller NP300'),
];

// PIIC-101 routes at days 30,36,42,48,54 from base 2025-06-03 = índices 4..8
export const PIIC101_INCIDENTS: IncidentSpec[] = [4, 5, 6, 7, 8].map(
  (routeIndex): IncidentSpec => ({
    routeIndex,
    category: 'OPERATIVA',
    description: '[SEED_B] Incident blackout julio 2025 - operacion irregular detectada',
    severity: 'HIGH',
  })
);

// ─── PIIC-201 ────────────────────────────────────────────────────────────────
// EC-2: $95,000 motor completo → distorsiona TCO/KM y dispara FaseF
// TCO: 54,000+18,000+20,000+7,000+95,000+8,000 = 202,000 → REPLACE (score 2.24)
const PIIC201_FUEL_MONTHS = MONTHS_12.filter((m) => m !== '2026-01' && m !== '2026-02');

export const PIIC201_TRANSACTIONS: FinancialEntry[] = [
  ...lease(MONTHS_12, 4_500),
  tx('INSURANCE', 18_000, '2025-07', 'Qualitas'),
  ...fuelMonthly(PIIC201_FUEL_MONTHS, 2_000),
  tx('MAINTENANCE', 3_500, '2025-09', 'Taller NP300'),
  tx('MAINTENANCE', 3_500, '2025-12', 'Taller NP300'),
  tx('REPAIR', 95_000, '2025-11', 'Motor Mexico SA'), // EC-2 big bang
  tx('TIRE', 8_000, '2025-10', 'Llantas Vianney'),
];

export const PIIC201_INCIDENTS: IncidentSpec[] = [];

// ─── PIIC-202 ────────────────────────────────────────────────────────────────
// EC-2: ZERO incidents — unidad modelo de la flota, quality_factor = 1.0
// TCO: 54,000+22,000+26,400+10,500+8,000 = 120,900 → REPLACE (score 1.34)
export const PIIC202_TRANSACTIONS: FinancialEntry[] = [
  ...lease(MONTHS_12, 4_500),
  tx('INSURANCE', 22_000, '2025-07', 'Qualitas Premium'),
  ...fuelMonthly(MONTHS_12, 2_200),
  tx('MAINTENANCE', 3_500, '2025-09', 'Taller Silverado'),
  tx('MAINTENANCE', 3_500, '2026-01', 'Taller Silverado'),
  tx('MAINTENANCE', 3_500, '2026-04', 'Taller Silverado'),
  tx('TIRE', 8_000, '2025-10', 'Llantas Vianney'),
];

export const PIIC202_INCIDENTS: IncidentSpec[] = [];

// ─── PIIC-301 ────────────────────────────────────────────────────────────────
// EC-2: ALL 48 routes get incident → quality_factor = 0.00
// EC-3: EVALUATE boundary — TCO: 40,500+8,000+13,500+5,000 = 67,000 (score 0.744)
const PIIC301_ACTIVE_MONTHS = MONTHS_12.slice(0, 9); // 2025-06 .. 2026-02

export const PIIC301_TRANSACTIONS: FinancialEntry[] = [
  ...lease(PIIC301_ACTIVE_MONTHS, 4_500),
  tx('INSURANCE', 8_000, '2025-07', 'Mapfre'),
  ...fuelMonthly(PIIC301_ACTIVE_MONTHS, 1_500),
  tx('MAINTENANCE', 5_000, '2025-11', 'Taller NP300'),
];

// All 48 PIIC-301 routes (stopAtDay=293 → 48 routes at days 6,12,...,288)
export const PIIC301_INCIDENTS: IncidentSpec[] = Array.from(
  { length: 48 },
  (_, i): IncidentSpec => {
    let severity: IncidentSeverity;
    if (i % 4 === 0) severity = 'CRITICAL';
    else if (i % 3 === 0) severity = 'HIGH';
    else if (i % 2 === 0) severity = 'MEDIUM';
    else severity = 'LOW';
    return {
      routeIndex: i,
      category: 'OPERATIVA',
      description: '[SEED_B] All-incidents EC-2 PIIC-301 - quality degradation pattern',
      severity,
    };
  }
);

// ─── PIIC-302 ────────────────────────────────────────────────────────────────
// EC-2: TCO máximo → REPLACE
// TCO: 54,000+20,000+36,000+30,000+45,000+20,000 = 205,000 → REPLACE (score 2.28)
export const PIIC302_TRANSACTIONS: FinancialEntry[] = [
  ...lease(MONTHS_12, 4_500),
  tx('INSURANCE', 20_000, '2025-07', 'Qualitas'),
  ...fuelMonthly(MONTHS_12, 3_000),
  tx('MAINTENANCE', 15_000, '2025-09', 'Taller Comercial'),
  tx('MAINTENANCE', 15_000, '2026-02', 'Taller Comercial'),
  tx('REPAIR', 45_000, '2026-02', 'Taller Comercial'),
  tx('TIRE', 20_000, '2025-11', 'Llantas Vianney'),
];

export const PIIC302_INCIDENTS: IncidentSpec[] = [];

// ─── PIIC-303 ────────────────────────────────────────────────────────────────
// EC-2: 3 reparaciones garantía $0.00
// EC-3: REPLACE hard — TCO: 54,000+20,000+24,000+8,000+3,000+8,000 = 117,000 (score 1.30)
export const PIIC303_TRANSACTIONS: FinancialEntry[] = [
  ...lease(MONTHS_12, 4_500),
  tx('INSURANCE', 20_000, '2025-07', 'Qualitas'),
  ...fuelMonthly(MONTHS_12, 2_000),
  tx('MAINTENANCE', 4_000, '2025-09', 'Taller NP300'),
  tx('MAINTENANCE', 4_000, '2026-01', 'Taller NP300'),
  tx('REPAIR', 0, '2025-08', 'Distribuidor Nissan'), // EC-2 warranty
  tx('REPAIR', 0, '2025-10', 'Distribuidor Nissan'), // EC-2 warranty
  tx('REPAIR', 0, '2026-02', 'Distribuidor Nissan'), // EC-2 warranty
  tx('REPAIR', 3_000, '2026-04', 'Taller NP300'),
  tx('TIRE', 8_000, '2025-11', 'Llantas Vianney'),
];

export const PIIC303_INCIDENTS: IncidentSpec[] = [];

// ─── PIIC-304/305 — VIM FaseF ────────────────────────────────────────────────
// TCO: 54,000+24,000+5,000 = 83,000 → EVALUATE (score 0.92)
export const PIIC304_TRANSACTIONS: FinancialEntry[] = [
  ...lease(MONTHS_12, 4_500),
  ...fuelMonthly(MONTHS_12, 2_000),
  tx('MAINTENANCE', 5_000, '2025-09', 'Taller NP300'),
];

export const PIIC304_INCIDENTS: IncidentSpec[] = [];

export const PIIC305_TRANSACTIONS: FinancialEntry[] = [
  ...lease(MONTHS_12, 4_500),
  ...fuelMonthly(MONTHS_12, 2_000),
  tx('MAINTENANCE', 5_000, '2025-09', 'Taller NP300'),
];

export const PIIC305_INCIDENTS: IncidentSpec[] = [];

// ─── Aggregate ───────────────────────────────────────────────────────────────

export const ALL_UNIT_B_SEEDING: UnitBSeeding[] = [
  { unitId: 'PIIC-101', transactions: PIIC101_TRANSACTIONS, incidents: PIIC101_INCIDENTS },
  { unitId: 'PIIC-201', transactions: PIIC201_TRANSACTIONS, incidents: PIIC201_INCIDENTS },
  { unitId: 'PIIC-202', transactions: PIIC202_TRANSACTIONS, incidents: PIIC202_INCIDENTS },
  { unitId: 'PIIC-301', transactions: PIIC301_TRANSACTIONS, incidents: PIIC301_INCIDENTS },
  { unitId: 'PIIC-302', transactions: PIIC302_TRANSACTIONS, incidents: PIIC302_INCIDENTS },
  { unitId: 'PIIC-303', transactions: PIIC303_TRANSACTIONS, incidents: PIIC303_INCIDENTS },
  { unitId: 'PIIC-304', transactions: PIIC304_TRANSACTIONS, incidents: PIIC304_INCIDENTS },
  { unitId: 'PIIC-305', transactions: PIIC305_TRANSACTIONS, incidents: PIIC305_INCIDENTS },
];

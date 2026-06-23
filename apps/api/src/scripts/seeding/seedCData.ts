/**
 * FaseC seeding data definitions — FC DataResilience_NHTSAIntegration
 * Exported separately so tests can import without DB/env dependencies.
 */

export const SEED_C_TAG = 'DC-'; // campaign_code prefix for cleanup

export interface RecallEntry {
  campaignCode: string;
  description: string;
  make: string;
  model: string;
  year: number;
  publishedDate: string; // YYYY-MM-DD
}

export type RecallStatus = 'PENDING' | 'COMPLETED' | 'NOT_APPLICABLE';

export interface UnitRecallAssignment {
  unitId: string;
  campaignCode: string;
  status: RecallStatus;
  resolvedAt?: string; // YYYY-MM-DD, required when COMPLETED
}

export interface ComplianceUpdate {
  unitId: string;
  insuranceExpiryDate: string; // YYYY-MM-DD
  vencimientoVerificacion: string; // YYYY-MM-DD
  insurancePolicyNumber: string;
}

// ─── catalog_recalls — 6 campañas ────────────────────────────────────────────

export const RECALL_CATALOG: RecallEntry[] = [
  {
    campaignCode: 'DC-NP300-2021-A',
    description:
      'Defecto en asistencia de dirección hidráulica — posible pérdida de control en velocidades altas.',
    make: 'NISSAN',
    model: 'NP300',
    year: 2021,
    publishedDate: '2024-03-15',
  },
  {
    campaignCode: 'DC-NP300-2021-B',
    description:
      'Inflador de bolsa de aire defectuoso — riesgo de proyección de fragmentos metálicos.',
    make: 'NISSAN',
    model: 'NP300',
    year: 2021,
    publishedDate: '2024-07-22',
  },
  {
    campaignCode: 'DC-NP300-2021-C',
    description:
      'Contaminación de líquido de frenos — reducción de eficacia de frenado en condiciones húmedas.',
    make: 'NISSAN',
    model: 'NP300',
    year: 2021,
    publishedDate: '2025-01-10',
  },
  {
    campaignCode: 'DC-SILV-2019-A',
    description:
      'Sensor de cinturón de seguridad — puede no detectar ocupante correctamente, desactivando airbag.',
    make: 'CHEVROLET',
    model: 'SILVERADO 1500',
    year: 2019,
    publishedDate: '2024-05-08',
  },
  {
    campaignCode: 'DC-SILV-2019-B',
    description:
      'Módulo de airbag lateral — circuito defectuoso puede impedir despliegue en colisión lateral.',
    make: 'CHEVROLET',
    model: 'SILVERADO 1500',
    year: 2019,
    publishedDate: '2023-11-30',
  },
  {
    campaignCode: 'DC-NP300-2020-A',
    description:
      'Inyector de combustible — goteo interno puede causar exceso de consumo y arranque irregular.',
    make: 'NISSAN',
    model: 'NP300',
    year: 2020,
    publishedDate: '2025-03-20',
  },
];

// ─── fleet_unit_recalls — asignaciones por unidad ─────────────────────────────

export const UNIT_RECALL_ASSIGNMENTS: UnitRecallAssignment[] = [
  // PIIC-101 EC-2: TRIPLE RECALL — 3 campañas PENDING simultáneas
  { unitId: 'PIIC-101', campaignCode: 'DC-NP300-2021-A', status: 'PENDING' },
  { unitId: 'PIIC-101', campaignCode: 'DC-NP300-2021-B', status: 'PENDING' },
  { unitId: 'PIIC-101', campaignCode: 'DC-NP300-2021-C', status: 'PENDING' },

  // PIIC-202 EC-1: PERFECT COMPLIANCE — 1 PENDING + 1 COMPLETED (ya atendido)
  { unitId: 'PIIC-202', campaignCode: 'DC-SILV-2019-A', status: 'PENDING' },
  {
    unitId: 'PIIC-202',
    campaignCode: 'DC-SILV-2019-B',
    status: 'COMPLETED',
    resolvedAt: '2024-12-01',
  },

  // PIIC-303 EC-1: RECALL + MAINTENANCE OVERLAP — recall vinculado al defecto atendido
  { unitId: 'PIIC-303', campaignCode: 'DC-NP300-2020-A', status: 'PENDING' },
];

// ─── Compliance update — PIIC-202 EC-1 ────────────────────────────────────────
// Fechas futuras como outlier positivo de la flota

export const PIIC202_COMPLIANCE: ComplianceUpdate = {
  unitId: 'PIIC-202',
  insuranceExpiryDate: '2027-12-31',
  vencimientoVerificacion: '2027-06-30',
  insurancePolicyNumber: 'QUA-2024-SIL-0482',
};

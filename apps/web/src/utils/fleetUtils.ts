import { CreateFleetUnit } from '../types/fleet';

/**
 * World-Class Engineering Utility: Fleet Asset Initialization
 * Implementation: PIIC Sovereign Standards
 */

/**
 * Generates the initial empty or mock state for a Fleet Asset registration.
 * Default values are set to facilitate 'Accelerated Inspection' during QA phases.
 * @returns {CreateFleetUnit} A fully hydrated fleet registration payload.
 */
export const getInitialFleetForm = (): CreateFleetUnit => ({
  assetTypeId: null,
  brandId: null,
  modelId: null,
  id: '',
  placas: '',
  numeroSerie: '',
  images: [] as string[],
  year: undefined,
  departmentId: undefined,
  operationalUseId: undefined,
  motor: '',
  traccionId: null,
  transmisionId: null,
  fuelTypeId: null,
  tireSpec: '',
  tireBrandId: undefined,
  terrainTypeId: undefined,
  capacidadCarga: undefined,
  fuelTankCapacity: undefined,
  odometer: undefined,
  sede: '',
  centroMantenimiento: '' as const,
  vigenciaSeguro: '',
  vencimientoVerificacion: '',
  protocolStartDate: '',
  status: 'Disponible',
  color: '',
  lubeType: '',
  filterBrand: '',
  description: '',
  // 🔱 Sovereign Asset Management (v.39.0.0)
  ownerId: null,
  complianceStatusId: null,
  accountingAccount: '',
  legalComplianceDate: '',
  insuranceExpiryDate: '',
  insurancePolicyNumber: '',
  insuranceCompany: '',
  lastEnvironmentalVerification: '',
  lastMechanicalVerification: '',
  circulationCardNumber: '',
  monthlyLeasePayment: undefined,
  // 🔱 Archon Intelligence (v.18.0.0)
  maintenanceTimeFreqId: null,
  maintenanceUsageFreqId: null,
  maintIntervalDays: undefined,
  maintIntervalKm: undefined,
  lastServiceDate: '',
  lastServiceReading: undefined,
  dailyUsageAvg: undefined,
});

export default getInitialFleetForm;

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
  year: new Date().getFullYear(),
  departmentId: undefined,
  operationalUseId: undefined,
  motor: '',
  traccionId: null,
  transmisionId: null,
  fuelTypeId: null,
  tireSpec: '',
  tireBrandId: undefined,
  terrainTypeId: undefined,
  capacidadCarga: '',
  odometer: undefined,
  sede: '',
  centroMantenimiento: 'PIIC',
  vigenciaSeguro: '',
  vencimientoVerificacion: '',
  tarjetaCirculacion: '',
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
  insurance_policy_number: '',
  insurance_company: '',
  last_environmental_verification: '',
  last_mechanical_verification: '',
  circulation_card_number: '',
  monthlyLeasePayment: undefined,
  // 🔱 Archon Intelligence (v.18.0.0)
  maintenanceTimeFreqId: null,
  maintenanceUsageFreqId: null,
  lastServiceDate: '',
  lastServiceReading: undefined,
  dailyUsageAvg: undefined,
});

export default getInitialFleetForm;

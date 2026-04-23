import { CreateFleetUnit, MaintenanceFrequency } from '../types/fleet';

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
  assetTypeId: null, // Initialized as null for reactive sync
  marcaId: '',
  modeloId: '',
  id: '',
  placas: '',
  numeroSerie: '',
  images: [] as string[],
  marca: '',
  modelo: '',
  year: new Date().getFullYear(),
  departamento: '',
  uso: '',
  motor: '',
  traccionId: null,
  transmisionId: null,
  fuelTypeId: null,
  tireSpec: '',
  tireBrand: '',
  tipoTerreno: '',
  capacidadCarga: '',
  odometer: 0,
  sede: '',
  centroMantenimiento: 'PIIC',
  vigenciaSeguro: '',
  vencimientoVerificacion: '',
  tarjetaCirculacion: '',
  maintenanceFrequency: 'Mensual' as MaintenanceFrequency,
  protocolStartDate: '',
  status: 'Disponible',
  color: '',
  lubeType: '',
  filterBrand: '',
  description: '',
  // 🔱 Archon Intelligence (v.18.0.0)
  maintenanceTimeFreqId: null,
  maintenanceUsageFreqId: null,
  lastServiceDate: '',
  lastServiceReading: 0,
  dailyUsageAvg: 0,
});

export default getInitialFleetForm;

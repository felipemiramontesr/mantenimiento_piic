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
  assetTypeId: 1, // Vehiculo
  id: 'ASM-002',
  placas: 'ZH-3153-B',
  numeroSerie: '1D7HW48P87S256272',
  images: [] as string[],
  marca: 'Toyota',
  modelo: 'Hilux',
  year: 2007,
  departamento: 'Medio Ambiente',
  uso: 'Terracería',
  motor: '2KD-FTV 2.5L Turbo Diesel',
  traccionId: 20, // 4x4 (Total)
  transmisionId: 31, // Manual (5 vel)
  fuelTypeId: 11, // Diesel
  tireSpec: '255/70 R17',
  tireBrand: 'BFGoodrich',
  tipoTerreno: 'All-Terrain',
  capacidadCarga: '1,000 kg',
  odometer: 152430,
  sede: 'Arian Silver Zacatecas',
  centroMantenimiento: 'PIIC',
  vigenciaSeguro: '2025-12-31',
  vencimientoVerificacion: '2025-06-30',
  tarjetaCirculacion: 'TC-ASM-002-2024',
  maintenanceFrequency: 'Mensual',
  protocolStartDate: '2024-04-17',
  status: 'Disponible',
  color: 'Blanco',
  description:
    'Unidad asignada a Medio Ambiente para monitoreo en zonas de terracería. Cuenta con radio y kit de seguridad minero.',
  // 🔱 Archon Intelligence (v.18.0.0)
  maintenanceTimeFreqId: 41, // Mensual
  maintenanceUsageFreqId: 51, // Kilometraje (Motor)
  lastServiceDate: '2024-03-01',
  lastServiceReading: 150000,
});

export default getInitialFleetForm;

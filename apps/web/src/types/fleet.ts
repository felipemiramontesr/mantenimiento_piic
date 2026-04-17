// ⚡ SOVEREIGN FLEET TYPE SYSTEM
// Architecture: PIIC Fleet Asset Intelligence

export type AssetType = 'Vehiculo' | 'Maquinaria' | 'Herramienta';
export type FleetStatus = 'Disponible' | 'En Ruta' | 'En Mantenimiento' | 'Descontinuada';
export type Traccion = '4x2' | '4x4' | 'Doble Tracción' | 'AWD' | 'Oruga' | 'No Aplica';
export type Transmision = 'Automática' | 'Estándar (Manual)' | 'CVT' | 'Hidrostática' | 'No Aplica';
export type FuelType = 'Gasolina' | 'Diesel' | 'Eléctrico' | 'Híbrido' | 'No Aplica';
export type MaintenanceFrequency =
  | 'Diaria'
  | 'Semanal'
  | 'Mensual'
  | 'Bimestral'
  | 'Semestral'
  | 'Anual';
export type CentroMantenimiento = 'PIIC' | 'Archon Core';

export interface FleetUnit {
  id: string; // FLXXX format
  uuid: string;
  // Level 1: Root classifier
  asset_type: AssetType;
  // Primary identifiers
  tag: string; // Número Económico
  placas: string | null;
  numero_serie: string | null;
  // Level 2 & 3: Cascade
  marca: string;
  modelo: string;
  images: string[] | null;
  year: number;
  departamento: string | null;
  uso: string | null;
  motor: string | null;
  // Mechanical configuration
  traccion: Traccion;
  transmision: Transmision;
  fuel_type: FuelType;
  // Tires
  tire_spec: string | null;
  tire_brand: string | null;
  tipo_terreno: string | null;
  // Operational
  capacidad_carga: string | null;
  odometer: number; // km (Vehiculo) | hrs (Maquinaria)
  // Organization
  sede: string | null;
  maintenance_frequency: MaintenanceFrequency;
  centro_mantenimiento: CentroMantenimiento;
  protocol_start_date: string | null; // ISO date
  // Legal & Compliance
  vigencia_seguro: string | null; // ISO date
  vencimiento_verificacion: string | null; // ISO date
  tarjeta_circulacion: string | null;
  // Status
  status: FleetStatus;
  assigned_operator_id: number | null;
  // Audit
  created_at: string;
  updated_at: string;
}

export interface CreateFleetUnit {
  assetType: AssetType;
  tag: string;
  placas?: string;
  numeroSerie?: string;
  marca: string;
  modelo: string;
  images?: string[];
  year: number;
  departamento?: string;
  uso?: string;
  motor?: string;
  traccion: Traccion;
  transmision: Transmision;
  fuelType: FuelType;
  tireSpec?: string;
  tireBrand?: string;
  tipoTerreno?: string;
  capacidadCarga?: string;
  odometer?: number;
  sede?: string;
  maintenanceFrequency: MaintenanceFrequency;
  centroMantenimiento: CentroMantenimiento;
  protocolStartDate?: string;
  vigenciaSeguro?: string;
  vencimientoVerificacion?: string;
  tarjetaCirculacion?: string;
  status?: FleetStatus;
  color?: string;
  description?: string;
}

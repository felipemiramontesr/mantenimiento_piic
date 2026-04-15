// ⚡ SOVEREIGN FLEET TYPE SYSTEM (v.7.1.4)
// Architecture: PIIC Fleet Asset Intelligence

export type AssetType = 'Vehiculo' | 'Maquinaria' | 'Herramienta';
export type FleetStatus = 'Disponible' | 'En Ruta' | 'En Mantenimiento' | 'Descontinuada';
export type Traccion = '4x2' | '4x4' | 'Doble Tracción' | 'AWD' | 'Oruga' | 'N/A';
export type Transmision = 'Automática' | 'Estándar (Manual)' | 'CVT' | 'Hidrostática' | 'N/A';
export type FuelType = 'Gasolina' | 'Diesel' | 'Eléctrico' | 'Híbrido' | 'N/A';
export type CentroMantenimiento = 'PIIC' | 'Archon Core';

export interface FleetUnit {
  id: string; // FLXXX format
  uuid: string;
  // Level 1: Root classifier
  asset_type: AssetType;
  // Primary identifiers
  tag: string; // Número Económico
  numero_serie: string | null;
  // Level 2 & 3: Cascade
  marca: string;
  modelo: string;
  year: number;
  motor: string | null;
  // Mechanical configuration
  traccion: Traccion;
  transmision: Transmision;
  fuel_type: FuelType;
  // Tires
  tire_spec: string | null;
  tire_brand: string | null;
  // Operational
  capacidad_carga: string | null;
  odometer: number; // km (Vehiculo) | hrs (Maquinaria)
  // Organization
  sede: string | null;
  centro_mantenimiento: CentroMantenimiento;
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
  asset_type: AssetType;
  tag: string;
  numero_serie?: string;
  marca: string;
  modelo: string;
  year: number;
  motor?: string;
  traccion: Traccion;
  transmision: Transmision;
  fuel_type: FuelType;
  tire_spec?: string;
  tire_brand?: string;
  capacidad_carga?: string;
  odometer?: number;
  sede?: string;
  centro_mantenimiento: CentroMantenimiento;
  vigencia_seguro?: string;
  vencimiento_verificacion?: string;
  tarjeta_circulacion?: string;
  status?: FleetStatus;
}

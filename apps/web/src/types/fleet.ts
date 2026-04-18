import React from 'react';

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
  | 'Trimestral'
  | 'Bimestral'
  | 'Semestral'
  | 'Anual';
export type CentroMantenimiento = 'PIIC' | 'Archon Core';

export interface FleetUnit {
  id: string; // Master ID (e.g. ASM-002)
  uuid: string;
  // Level 1: Root classifier
  asset_type: AssetType;
  // Primary identifiers
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
  // 🔱 Archon Intelligence (v.18.0.0)
  maintenance_time_freq_id?: number | null;
  maintenance_usage_freq_id?: number | null;
  last_service_date?: string | null;
  last_service_reading?: number;
  current_reading?: number;
  // 🔱 Computed Health Data
  health_score?: number;
  health_status?: string;
  health_color?: string;
  days_since_service?: number | null;
  units_since_service?: number;
}

export interface CreateFleetUnit {
  assetType: AssetType;
  id: string;
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
  // 🔱 Archon Intelligence (v.18.0.0)
  maintenanceTimeFreqId?: number | null;
  maintenanceUsageFreqId?: number | null;
  lastServiceDate?: string | null;
  lastServiceReading?: number;
}

export interface UseFleetFormReturn {
  formData: CreateFleetUnit;
  error: string | null;
  resetError: () => void;
  isSubmitting: boolean;
  registrationSuccess: boolean;
  availableMarcas: string[];
  availableModelos: string[];
  freqTime: string[];
  freqUsage: { id: number; label: string }[];
  setFormData: (data: CreateFleetUnit | ((prev: CreateFleetUnit) => CreateFleetUnit)) => void;
  setError: (error: string | null) => void;
  setRegistrationSuccess: (success: boolean) => void;
  handleAssetTypeChange: (type: AssetType) => void;
  handleMarcaChange: (marca: string) => void;
  handleSubmit: (e: React.FormEvent, onSuccess?: () => Promise<void>) => Promise<void>;
  resetForm: () => void;
}

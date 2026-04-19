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

export interface CatalogOption {
  id: number;
  label: string;
}

export interface FleetUnit {
  id: string; // Master ID (e.g. ASM-002)
  uuid: string;
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
  updated_at: string;
  // 🔱 Relational ID Fields (v.21.0.0)
  asset_type_id: number;
  fuel_type_id: number;
  traccion_id: number;
  transmision_id: number;
  // Joined Labels (UI)
  asset_type?: string;
  fuel_type?: string;
  traccion?: string;
  transmision?: string;
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
  // 🔱 Archon Analytical Engine (v.20.0.0)
  availability_index?: number;
  mtbf_hours?: number;
  mttr_hours?: number;
  backlog_count?: number;
  // 🔱 Predictive Strategy (v.28.0.0)
  maint_interval_km?: number;
  maint_interval_days?: number;
  avg_daily_km?: number;
}

export interface CreateFleetUnit {
  assetTypeId: number | null;
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
  traccionId: number | null;
  transmisionId: number | null;
  fuelTypeId: number | null;
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
  maintIntervalKm?: number;
  maintIntervalDays?: number;
  avgDailyKm?: number;
}

export interface UseFleetFormReturn {
  formData: CreateFleetUnit;
  error: string | null;
  resetError: () => void;
  isSubmitting: boolean;
  registrationSuccess: boolean;
  // Dynamic Catalogs (v.21.0.0)
  assetTypes: CatalogOption[];
  fuelTypes: CatalogOption[];
  driveTypes: CatalogOption[];
  transmissionTypes: CatalogOption[];
  availableMarcas: string[];
  availableModelos: string[];
  freqTime: string[];
  freqUsage: CatalogOption[];
  setFormData: React.Dispatch<React.SetStateAction<CreateFleetUnit>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setRegistrationSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  handleAssetTypeChange: (typeId: number) => void;
  handleMarcaChange: (marca: string) => void;
  handleSubmit: (e: React.FormEvent, onSuccess?: () => Promise<void>) => Promise<void>;
  resetForm: () => void;
}

import React from 'react';

// ⚡ SOVEREIGN FLEET TYPE SYSTEM
// Architecture: PIIC Fleet Asset Intelligence

export type AssetType = 'Vehiculo' | 'Maquinaria' | 'Herramienta';
export type FleetStatus =
  | 'Disponible'
  | 'En Ruta'
  | 'Asignada'
  | 'En Mantenimiento'
  | 'Descontinuada';
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
  code?: string;
  label: string;
}

export interface FleetUnit {
  id: string; // Master ID (e.g. ASM-002)
  uuid: string;
  // Primary identifiers
  placas: string | null;
  numeroSerie: string | null;
  // Level 2 & 3: Cascade
  marca: string;
  modelo: string;
  images: string[] | null;
  year: number;
  departamento: string | null;
  uso: string | null;
  motor: string | null;
  // Tires
  tireSpec: string | null;
  tireBrand: string | null;
  tipoTerreno: string | null;
  // Operational
  capacidadCarga: string | null;
  odometer: number; // km (Vehiculo) | hrs (Maquinaria)
  // Organization
  sede: string | null;
  maintenanceFrequency: MaintenanceFrequency;
  centroMantenimiento: CentroMantenimiento;
  protocolStartDate: string | null; // ISO date
  // Legal & Compliance
  vigenciaSeguro: string | null; // ISO date
  vencimientoVerificacion: string | null; // ISO date
  tarjetaCirculacion: string | null;
  lubeType: string | null;
  filterBrand: string | null;
  // Status
  status: FleetStatus;
  assignedOperatorId: number | null;
  updatedAt: string;
  // 🔱 Dispatch & Routes (v.28.1.0)
  routeDescription?: string;
  routeDestination?: string;
  // 🔱 Relational ID Fields (v.21.0.0)
  assetTypeId: number;
  marcaId?: string | null;
  modeloId?: string | null;
  fuelTypeId: number;
  traccionId: number;
  transmisionId: number;
  // Joined Labels (UI)
  assetType?: string;
  fuelType?: string;
  traccion?: string;
  transmision?: string;
  // 🔱 Archon Intelligence (v.18.0.0)
  maintenanceTimeFreqId?: number | null;
  maintenanceUsageFreqId?: number | null;
  lastServiceDate?: string | null;
  lastServiceReading?: number;
  currentReading?: number;
  // 🔱 Computed Health Data
  healthScore?: number;
  healthStatus?: string;
  healthColor?: string;
  daysSinceService?: number | null;
  unitsSinceService?: number;
  // 🔱 Archon Analytical Engine (v.20.0.0)
  availabilityIndex?: number;
  mtbfHours?: number;
  mttrHours?: number;
  backlogCount?: number;
  // 🔱 Predictive Strategy (v.28.0.0)
  maintIntervalKm?: number;
  maintIntervalDays?: number;
  avgDailyKm?: number;
}

export interface CreateFleetUnit {
  assetTypeId: number | null;
  marcaId?: string | null;
  modeloId?: string | null;
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
  lubeType?: string;
  filterBrand?: string;
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
  isLoading: boolean;
  registrationSuccess: boolean;
  // Dynamic Catalogs (v.21.0.0)
  assetTypes: CatalogOption[];
  fuelTypes: CatalogOption[];
  driveTypes: CatalogOption[];
  transmissionTypes: CatalogOption[];
  availableMarcas: { value: string; label: string }[];
  availableModelos: { value: string; label: string }[];
  freqTime: string[];
  freqUsage: CatalogOption[];
  departments: string[];
  locations: string[];
  useTypes: string[];
  tireBrands: string[];
  lubeBrands: string[];
  filterBrands: string[];
  engineTypes: string[];
  terrainTypes: string[];
  marcas: CatalogOption[];
  modelos: CatalogOption[];
  setFormData: React.Dispatch<React.SetStateAction<CreateFleetUnit>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setRegistrationSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  handleAssetTypeChange: (typeId: number) => void;
  handleMarcaChange: (marcaId: string) => void;
  handleModeloChange: (modeloId: string) => void;
  handleSubmit: (e: React.FormEvent, onSuccess?: () => Promise<void>) => Promise<void>;
  resetForm: () => void;
}

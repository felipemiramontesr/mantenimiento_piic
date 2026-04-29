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
export type CentroMantenimiento = 'PIIC' | 'Archon Core';

export interface CatalogOption {
  id: number;
  code?: string;
  label: string;
  unit?: string;
  numeric_value?: number;
}

export interface FleetUnit {
  id: string; // Master ID (e.g. ASM-002)
  uuid: string;
  // Primary identifiers
  placas: string | null;
  numeroSerie: string | null;
  // Level 2 & 3: Cascade
  marca: string | null;
  brandId: number | null;
  modelo: string | null;
  modelId: number | null;
  images: string[] | null;
  year: number;
  departamento: string | null;
  departmentId: number | null;
  uso: string | null;
  operationalUseId: number | null;
  locationId: number | null;
  engineTypeId: number | null;
  colorId: number | null;
  motor: string | null;
  // Tires
  tireSpec: string | null;
  tireBrand: string | null;
  tireBrandId: number | null;
  tipoTerreno: string | null;
  terrainTypeId: number | null;
  // Operational
  capacidadCarga: number | null;
  fuelTankCapacity: number | null;
  odometer: number; // km (Vehiculo) | hrs (Maquinaria)
  // Organization
  sede: string | null;
  centroMantenimiento: string | null;
  maintenanceCenterId: number | null;
  protocolStartDate: string | null; // ISO date
  // Legal & Compliance
  vigenciaSeguro: string | null; // ISO date
  vencimientoVerificacion: string | null; // ISO date
  lubeType: string | null;
  filterBrand: string | null;
  // 🔱 Sovereign Asset Management (v.39.0.0)
  ownerId: number | null;
  owner?: string;
  complianceStatusId: number | null;
  complianceStatus?: string;
  accountingAccount: string | null;
  legalComplianceDate: string | null;
  insuranceExpiryDate: string | null;
  insurancePolicyNumber?: string | null;
  insuranceCompany?: string | null;
  insuranceCompanyId: number | null;
  lastEnvironmentalVerification?: string | null;
  lastMechanicalVerification?: string | null;
  circulationCardNumber: string | null;
  monthlyLeasePayment: number;
  // Status
  status: FleetStatus;
  assignedOperatorId: number | null;
  updatedAt: string;
  // 🔱 Dispatch & Routes (v.28.1.0)
  routeDescription?: string;
  routeDestination?: string;
  // 🔱 Relational ID Fields (v.21.0.0)
  assetTypeId: number;
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
  maintIntervalDays?: number;
  maintIntervalKm?: number;
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
  dailyUsageAvg?: number | null;
  // 🔱 Dynamic Catalog Computed Fields (v.39.7.0)
  timeLimitDays?: number | null;
  usageLimitUnits?: number | null;
  usageUnitName?: string | null;
  timeFreqLabel?: string | null;
  usageFreqLabel?: string | null;
}

export interface CreateFleetUnit {
  assetTypeId: number | null;
  brandId: number | null;
  modelId: number | null;
  id: string;
  placas?: string;
  numeroSerie?: string;
  images?: string[];
  year?: number;
  departmentId?: number;
  operationalUseId?: number;
  traccionId: number | null;
  transmisionId: number | null;
  fuelTypeId: number | null;
  tireSpec?: string;
  tireBrandId?: number;
  terrainTypeId?: number;
  capacidadCarga?: number;
  fuelTankCapacity?: number;
  odometer?: number;
  locationId?: number | null;
  maintenanceCenterId?: number | null;
  protocolStartDate?: string;
  vigenciaSeguro?: string;
  vencimientoVerificacion?: string;
  status?: FleetStatus;
  colorId?: number | null;
  engineTypeId?: number | null;
  description?: string;
  lubeType?: string;
  filterBrand?: string;
  // 🔱 Sovereign Asset Management (v.39.0.0)
  ownerId?: number | null;
  complianceStatusId?: number | null;
  accountingAccount?: string;
  legalComplianceDate?: string;
  insuranceExpiryDate?: string;
  insurancePolicyNumber?: string;
  insuranceCompanyId?: number | null;
  lastEnvironmentalVerification?: string;
  lastMechanicalVerification?: string;
  circulationCardNumber?: string;
  monthlyLeasePayment?: number;
  // 🔱 Archon Intelligence (v.18.0.0)
  maintenanceTimeFreqId?: number | null;
  maintenanceUsageFreqId?: number | null;
  lastServiceDate?: string | null;
  lastServiceReading?: number;
  maintIntervalKm?: number;
  maintIntervalDays?: number;
  dailyUsageAvg?: number | null;
  insurance_company_id?: number | null;
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
  freqTime: CatalogOption[];
  freqUsage: CatalogOption[];
  departments: CatalogOption[];
  locations: CatalogOption[];
  useTypes: CatalogOption[];
  tireBrands: CatalogOption[];
  lubeBrands: CatalogOption[];
  filterBrands: CatalogOption[];
  engineTypes: CatalogOption[];
  terrainTypes: CatalogOption[];
  marcas: CatalogOption[];
  modelos: CatalogOption[];
  owners: CatalogOption[];
  complianceStatuses: CatalogOption[];
  colors: CatalogOption[];
  maintenanceCenters: CatalogOption[];
  insuranceCompanies: CatalogOption[];
  routeOrigins: CatalogOption[];
  setFormData: React.Dispatch<React.SetStateAction<CreateFleetUnit>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setRegistrationSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  handleAssetTypeChange: (typeId: number) => void;
  handleMarcaChange: (brandId: number) => void;
  handleModeloChange: (modelId: number) => void;
  handleSubmit: (e: React.FormEvent, onSuccess?: () => Promise<void>) => Promise<void>;
  resetForm: () => void;
}

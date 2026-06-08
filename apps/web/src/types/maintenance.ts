export type MaintenancePanel =
  | 'HISTORY'
  | 'FORECAST'
  | 'SCHEDULE'
  | 'COMPLETE'
  | 'HISTORY_DETAIL'
  | 'UPA';

export type MovementStatus = 'OPEN' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type ServiceType =
  | 'BASIC_10K'
  | 'INTERMEDIATE_20K'
  | 'MAJOR_30K'
  | 'ADVANCED_50K'
  | 'MINOR_MINING';

export type ServiceMode = 'FULL_COMPLIANCE' | 'PARTIAL_EXECUTION' | 'IN_SITU' | 'WORKSHOP';

export type MaintenanceLog = {
  id: number;
  uuid: string;
  unit_id: string;
  upa_work_order_id?: number | null;
  service_date: string;
  odometer_at_service: number;
  odometer_at_close?: number | null;
  fuel_level_start?: number | null;
  fuel_level_end?: number | null;
  fuel_liters_loaded?: number | null;
  fuel_amount?: number | null;
  service_type: ServiceType;
  service_mode: ServiceMode;
  system_recommended_type: ServiceType | null;
  cost: number;
  technician: string;
  created_at: string;
  start_at: string | null;
  end_at: string | null;
  movement_status?: MovementStatus;
};

export type MaintenanceTemplateTask = {
  code: string;
  label: string;
  isCritical: boolean;
  isDeferredCarry: boolean;
};

export type MaintenanceDetail = {
  taskCode: string;
  status: string;
  notes?: string;
};

export type MaintenanceTaskDetail = {
  taskCode: string;
  label: string;
  status: string;
  statusLabel: string;
  notes: string | null;
  isCritical: boolean;
};

export type MaintenanceFullDetail = MaintenanceLog & {
  details: MaintenanceTaskDetail[];
};

export type MaintenanceSchedulePayload = {
  unitId: string;
  serviceDate: string;
  odometerAtService: number;
  cost: number;
  technician: string;
  details: MaintenanceDetail[];
  /** When true: unit enters Downtime; close later via PATCH /maintenance/:uuid/complete */
  is_in_progress?: boolean;
  fuelLevelEnd?: number;
  fuelLitersLoaded?: number;
  fuelAmount?: number;
  /** Post-service odometer (test drives + return trip). Defaults to odometerAtService. */
  endOdometer?: number;
};

export type MaintenanceCompletionPayload = {
  odometerAtService: number;
  cost: number;
  serviceDate?: string;
  technician?: string;
  details: MaintenanceDetail[];
  fuelLevelEnd?: number;
  fuelLitersLoaded?: number;
  fuelAmount?: number;
  /** Post-service odometer (test drives + return trip). Defaults to odometerAtService. */
  endOdometer?: number;
};

export type UpaTaskStage = 'triage' | 'minor_service' | 'cascade' | 'deferred' | 'closure';
export type UpaPackageLevel = '10k' | '20k' | '30k' | '50k';

export type UpaPreviewTask = {
  id: string;
  stage: UpaTaskStage;
  description: string;
  packageLevel: UpaPackageLevel | null;
};

export type ForecastUrgency = 'CRITICAL' | 'WARNING' | 'OK';

export type MaintenanceForecastRow = {
  unitId: string;
  marca: string;
  modelo: string;
  departamento: string;
  currentOdometer: number;
  dailyUsageAvg: number;
  nextKmReading: number;
  kmRemaining: number;
  nextServiceDate: string;
  daysUntilService: number;
  triggerType: 'KM' | 'DATE';
  projectedOdometer: number;
  projectedServiceType: ServiceType;
  urgency: ForecastUrgency;
};

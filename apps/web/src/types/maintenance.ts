export type MaintenancePanel = 'HISTORY' | 'SCHEDULE' | 'COMPLETE' | 'HISTORY_DETAIL';

export type MovementStatus = 'OPEN' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type ServiceType =
  | 'BASIC_10K'
  | 'INTERMEDIATE_20K'
  | 'MAJOR_30K'
  | 'ADVANCED_50K'
  | 'MINOR_MINING';

/** Persisted compliance mode — always FULL_COMPLIANCE post-cyclic engine */
export type ServiceMode = 'FULL_COMPLIANCE' | 'PARTIAL_EXECUTION';

export type MaintenanceLog = {
  id: number;
  uuid: string;
  unit_id: string;
  service_date: string;
  odometer_at_service: number;
  service_type: ServiceType;
  service_mode: ServiceMode;
  system_recommended_type: ServiceType | null;
  cost: number;
  technician: string;
  created_at: string;
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
};

export type MaintenanceCompletionPayload = {
  odometerAtService: number;
  cost: number;
  serviceDate?: string;
  technician?: string;
  details: MaintenanceDetail[];
};

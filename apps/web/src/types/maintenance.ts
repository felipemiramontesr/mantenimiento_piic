export type MaintenancePanel = 'HISTORY' | 'SCHEDULE';

export type ServiceType =
  | 'BASIC_10K'
  | 'INTERMEDIATE_20K'
  | 'MAJOR_30K'
  | 'ADVANCED_50K'
  | 'MINOR_MINING';

/** Compliance mode derived from systemRecommended vs userSelected */
export type ServiceMode = 'FULL_COMPLIANCE' | 'PARTIAL_EXECUTION';

/**
 * Ordinal rank map for the Compliance Hierarchy Engine.
 * Higher value = more comprehensive service.
 * MINOR_MINING is a parallel protocol (rank 0) � never triggers PARTIAL_EXECUTION.
 */
export const SERVICE_HIERARCHY: Record<ServiceType, number> = {
  BASIC_10K: 1,
  INTERMEDIATE_20K: 2,
  MAJOR_30K: 3,
  ADVANCED_50K: 4,
  MINOR_MINING: 0,
};

/**
 * Multidimensional compliance state.
 * systemRecommended = immutable truth derived from odometry.
 * userSelected      = mutable action chosen by the technician.
 * serviceMode       = computed compliance classification.
 */
export type ComplianceState = {
  systemRecommended: ServiceType;
  userSelected: ServiceType;
  serviceMode: ServiceMode;
};

export type MaintenanceLog = {
  id: number;
  uuid: string;
  unit_id: string;
  unit_name?: string;
  placas?: string;
  service_date: string;
  odometer_at_service: number;
  service_type: ServiceType;
  /** Compliance mode persisted at registration time */
  service_mode: ServiceMode;
  /** Odometry-derived recommended service at time of registration */
  system_recommended_type: ServiceType | null;
  cost: number;
  technician: string;
  created_at: string;
};

export type MaintenanceTemplateTask = {
  code: string;
  label: string;
  isCritical: boolean;
};

export type MaintenanceDetail = {
  taskCode: string;
  status: 'PASS' | 'FAIL' | 'REPLACED' | 'N_A';
  notes?: string;
};

export type MaintenanceSchedulePayload = {
  unitId: string;
  serviceDate: string;
  odometerAtService: number;
  /** Service type chosen by the user (userSelected) */
  serviceType: ServiceType;
  /** Compliance classification derived from systemRecommended vs userSelected */
  serviceMode: ServiceMode;
  /** Odometry-derived system recommendation at time of registration */
  systemRecommendedType: ServiceType;
  cost: number;
  technician: string;
  details: MaintenanceDetail[];
};

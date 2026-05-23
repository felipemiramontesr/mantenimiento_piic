export type MaintenancePanel = 'HISTORY' | 'SCHEDULE';

export type ServiceType = 'BASIC_10K' | 'INTERMEDIATE_20K' | 'MAJOR_30K' | 'ADVANCED_50K' | 'MINOR_MINING';

export type MaintenanceLog = {
  id: number;
  uuid: string;
  unit_id: string;
  unit_name?: string;
  placas?: string;
  service_date: string;
  odometer_at_service: number;
  service_type: ServiceType;
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
  serviceType: ServiceType;
  cost: number;
  technician: string;
  details: MaintenanceDetail[];
};

import { MaintenanceLog } from '../../../types/maintenance';

export interface MaintenanceGridViewProps {
  refreshTrigger: number;
  onCompleteRequest?: (log: MaintenanceLog) => void;
  onDetailRequest?: (log: MaintenanceLog) => void;
  onAcceptOrder?: (uuid: string, logId: number) => void;
  onRejectOrder?: (uuid: string) => void;
  onOpenUpa?: (workOrderId: number) => void;
}

export interface SortConfig {
  field: 'activo' | 'service_type' | 'odometer_at_service' | 'service_date' | 'cost' | null;
  direction: 'asc' | 'desc';
}

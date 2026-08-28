export interface RouteLog {
  id: string;
  uuid: string;
  unit_id: string;
  operator_id: string;
  origin: string;
  destination: string;
  destination_neighborhood_id?: number;
  description?: string;
  fuelLevel?: number;
  fuel_level_start?: number;
  fuel_level_end?: number;
  start_time: string;
  end_time: string | null;
  start_km: number;
  end_km: number | null;
  fuel_liters_loaded?: number;
  fuel_amount?: number;
  fuel_ticket_image?: string;
  additives_check?: number | boolean;
  tire_pressure_json?: string;
  checklist_json?: string;
  checklist_after_json?: string;
  incident_count?: number;
  origin_id?: number;
}

export interface RouteLogTableProps {
  onEdit?: (l: RouteLog) => void;
}

export interface RouteLogRowProps {
  log: RouteLog;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: (l: RouteLog) => void;
  onReport: (l: RouteLog) => void;
  onFinish: (l: RouteLog) => void;
}

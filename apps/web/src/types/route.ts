export type RouteStatus = 'OPEN' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface ArchonRoute {
  id: number;
  uuid: string;
  unit_id: string;
  driver_id: number;
  origin_id?: number;
  destination: string;
  status: RouteStatus;
  start_reading: number;
  end_reading?: number;
  start_at?: string;
  end_at?: string;
  fuel_liters_loaded?: number;
  fuel_ticket_image?: string; // Base64
  created_at: string;
  updated_at: string;
}

export interface StartRoutePayload {
  unitId: string;
  driverId: number;
  startReading: number;
  destination: string;
  originId?: number;
}

export interface FinishRoutePayload {
  endReading: number;
  fuelLitersLoaded?: number;
  fuelTicketImage?: string;
}

export type IncidentCategory = 'MECANICA' | 'SINIESTRO' | 'LEGAL' | 'OPERATIVA' | 'OTRA';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

export interface RouteIncident {
  id: number;
  route_uuid: string;
  category: IncidentCategory;
  description: string;
  severity: IncidentSeverity;
  evidence_image?: string;
  reported_at: string;
  status: IncidentStatus;
}

export interface ReportIncidentPayload {
  category: IncidentCategory;
  description: string;
  severity: IncidentSeverity;
  evidenceImage?: string;
}

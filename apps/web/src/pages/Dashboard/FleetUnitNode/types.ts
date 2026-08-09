import { FleetUnit } from '../../../types/fleet';

export type NodeUnit = FleetUnit & { owner?: string };

export interface MaintenanceRecord {
  uuid: string;
  service_date: string;
  service_type: string;
  service_mode: string;
  cost: number;
  technician: string;
  odometer: number;
  status: string;
}

export interface IncidentRecord {
  id: number;
  category: string;
  description: string;
  severity: string;
  status: string;
  reported_at: string;
}

export interface NodeData {
  unit: NodeUnit;
  maintenance: { recentHistory: MaintenanceRecord[] };
  financial: { year: number; totalCost: number; byCategory: Record<string, number> };
  incidents: { recent: IncidentRecord[]; openCount: number };
}

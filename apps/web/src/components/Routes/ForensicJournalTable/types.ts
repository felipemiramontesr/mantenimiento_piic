export interface ActivityLog {
  id: string;
  unit_id: string;
  event_type: string;
  reference_id: string;
  reading_before: number;
  reading_after: number;
  status_before: string;
  status_after: string;
  fuel_before?: number;
  fuel_after?: number;
  fuel_level_before?: number;
  fuel_level_after?: number;
  fuel_amount_before?: number;
  fuel_amount_after?: number;
  snapshot_before?: Record<string, unknown>;
  snapshot_after?: Record<string, unknown>;
  description: string;
  operatorName: string;
  marca: string;
  modelo: string;
  created_at: string;
  unit_sede?: string;
  route_destination?: string;
  route_origin_label?: string;
}

export interface ForensicJournalTableProps {
  readonly unitId?: string;
  readonly routeUuid?: string;
  readonly hideHeader?: boolean;
}

export interface AuditRow {
  uuid: string;
  entity_type: string;
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  reason: string;
  snapshot_before: Record<string, unknown> | null;
  snapshot_after: Record<string, unknown> | null;
  created_at: string;
  owner_id: number | null;
  actor_username: string | null;
  actor_full_name: string | null;
  universe_label: string | null;
}

export interface AuditMeta {
  page: number;
  limit: number;
  total: number;
}

export interface Filters {
  entity_type: string;
  action: string;
  date_from: string;
  date_to: string;
}

export const EMPTY_FILTERS: Filters = { entity_type: '', action: '', date_from: '', date_to: '' };

export const ACTION_BADGE: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 border border-green-200',
  UPDATE: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  DELETE: 'bg-red-100 text-red-700 border border-red-200',
};

export const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Modificación',
  DELETE: 'Eliminación',
};

export const ENTITY_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'user', label: 'Usuario' },
  { value: 'fleet_unit', label: 'Vehículo' },
  { value: 'route_log', label: 'Ruta' },
  { value: 'catalog', label: 'Catálogo' },
];

export const ACTION_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'CREATE', label: 'Creación' },
  { value: 'UPDATE', label: 'Modificación' },
  { value: 'DELETE', label: 'Eliminación' },
];

export const LABEL_CLS =
  'text-archon-base font-black uppercase tracking-[0.15em] text-[#0f2a44]/50 mb-1 block';

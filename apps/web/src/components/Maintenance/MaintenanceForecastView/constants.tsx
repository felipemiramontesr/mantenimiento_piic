import React from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { ForecastUrgency, MaintenanceForecastRow, ServiceType } from '../../../types/maintenance';
import { ArchonTableHeader } from '../../UI/ArchonDataTable';

export const SERVICE_LABELS: Record<ServiceType, string> = {
  BASIC_10K: 'Básico 10K',
  INTERMEDIATE_20K: 'Intermedio 20K',
  MAJOR_30K: 'Mayor 30K - 40K',
  ADVANCED_50K: 'Avanzado 50K - 60K',
  MINOR_MINING: 'Servicio Menor',
};

export const SERVICE_WEIGHT: Record<ServiceType, number> = {
  MINOR_MINING: 1,
  BASIC_10K: 2,
  INTERMEDIATE_20K: 3,
  MAJOR_30K: 4,
  ADVANCED_50K: 5,
};

export const SERVICE_BADGE: Record<ServiceType, { bg: string; text: string; border: string }> = {
  BASIC_10K: { bg: 'bg-sky-500/10', text: 'text-sky-700', border: 'border-sky-500/20' },
  INTERMEDIATE_20K: { bg: 'bg-blue-500/10', text: 'text-blue-700', border: 'border-blue-500/20' },
  MAJOR_30K: { bg: 'bg-violet-500/10', text: 'text-violet-700', border: 'border-violet-500/20' },
  ADVANCED_50K: { bg: 'bg-rose-500/10', text: 'text-rose-700', border: 'border-rose-500/20' },
  MINOR_MINING: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700',
    border: 'border-emerald-500/20',
  },
};

export type UrgencyMeta = {
  bg: string;
  text: string;
  border: string;
  icon: React.ReactNode;
  label: string;
};

// FC 071 F2 — fallbacks para valores fuera de dominio: un lookup fallido aquí
// reventaba el render (`undefined.bg`) y, sin ErrorBoundary, desmontaba el root
// completo (071_AN E3). El dato desconocido se muestra tal cual, nunca crashea.
export const FALLBACK_BADGE = {
  bg: 'bg-slate-500/10',
  text: 'text-slate-600',
  border: 'border-slate-500/20',
};

/** Metadata visual de respaldo para una urgencia fuera del dominio conocido. */
export const fallbackUrgencyMeta = (urgency: string): UrgencyMeta => ({
  ...FALLBACK_BADGE,
  icon: null,
  label: urgency || '—',
});

export const URGENCY_META: Record<ForecastUrgency, UrgencyMeta> = {
  CRITICAL: {
    bg: 'bg-red-500/10',
    text: 'text-red-700',
    border: 'border-red-500/20',
    icon: <AlertTriangle size={10} />,
    label: 'Crítico',
  },
  WARNING: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-700',
    border: 'border-amber-400/30',
    icon: <Clock size={10} />,
    label: 'Próximo',
  },
  OK: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700',
    border: 'border-emerald-500/20',
    icon: <CheckCircle2 size={10} />,
    label: 'Al Día',
  },
};

export const headers: ArchonTableHeader[] = [
  { key: 'unitId', label: 'UNIDAD', sortable: true, align: 'center', width: '15%' },
  { key: 'departamento', label: 'DEPTO', sortable: false, align: 'center', width: '7%' },
  { key: 'currentOdometer', label: 'ODÓMETRO', sortable: true, align: 'center', width: '12%' },
  { key: 'kmRemaining', label: 'KM RESTANTES', sortable: true, align: 'center', width: '11%' },
  {
    key: 'nextServiceDate',
    label: 'PRÓX. SERVICIO',
    sortable: true,
    align: 'center',
    width: '12%',
  },
  {
    key: 'projectedServiceType',
    label: 'TIPO PROYECTADO',
    sortable: true,
    align: 'center',
    width: '14%',
  },
  { key: 'urgency', label: 'URGENCIA', sortable: false, align: 'center', width: '13%' },
  { key: 'action', label: 'ACCIONES', sortable: false, align: 'center', width: '12%' },
];

export type SortField = keyof MaintenanceForecastRow | null;

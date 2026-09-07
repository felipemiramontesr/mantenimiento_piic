import { MaintenanceForecastRow } from '../../../types/maintenance';
import { SERVICE_LABELS } from './constants';

/** Color de texto para los km restantes según su cercanía al umbral. */
export const kmRemainingColor = (km: number): string => {
  if (km <= 500) return 'text-red-600';
  if (km <= 2000) return 'text-amber-600';
  return 'text-[#0f2a44]';
};

/** Formatea una fecha ISO (YYYY-MM-DD) a DD/MM/YYYY. */
export const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/** Color de texto para los días restantes según su cercanía al vencimiento. */
export const daysColor = (days: number): string => {
  if (days <= 7) return 'text-red-500';
  if (days <= 30) return 'text-amber-600';
  return '';
};

/** Busca coincidencias de un término de búsqueda en unidad/depto/tipo de servicio. */
export const matchFieldInForecast = (
  row: MaintenanceForecastRow,
  query: string
): { label: string; value: string } | null => {
  if (row.unitId.toLowerCase().includes(query)) {
    return { label: 'Unidad', value: row.unitId };
  }
  if (row.departamento?.toLowerCase().includes(query)) {
    return { label: 'Depto', value: row.departamento };
  }
  const svcLabel = SERVICE_LABELS[row.projectedServiceType];
  if (svcLabel?.toLowerCase().includes(query)) {
    return { label: 'Servicio', value: svcLabel };
  }
  return null;
};

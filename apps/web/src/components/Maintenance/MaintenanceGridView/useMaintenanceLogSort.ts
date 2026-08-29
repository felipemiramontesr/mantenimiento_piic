import { useMemo, useState } from 'react';
import { MaintenanceLog } from '../../../types/maintenance';
import { matchFieldInMaintenance } from './searchMatchers';
import { SortConfig } from './types';

function getSortValue(
  log: MaintenanceLog,
  field: NonNullable<SortConfig['field']>
): string | number {
  if (field === 'activo') return log.id;
  if (field === 'service_type') return log.service_type;
  if (field === 'odometer_at_service') return Number(log.odometer_at_service || 0);
  if (field === 'service_date') return new Date(log.service_date).getTime();
  return Number(log.cost || 0); // field === 'cost'
}

function applySort(logs: MaintenanceLog[], sortConfig: SortConfig): MaintenanceLog[] {
  if (!sortConfig.field) return logs;
  const { field, direction } = sortConfig;
  return [...logs].sort((a, b) => {
    const valA = getSortValue(a, field);
    const valB = getSortValue(b, field);
    if (typeof valA === 'number' && typeof valB === 'number') {
      return direction === 'asc' ? valA - valB : valB - valA;
    }
    const strA = String(valA);
    const strB = String(valB);
    return direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
  });
}

function applyFilter(logs: MaintenanceLog[], searchTerm: string): MaintenanceLog[] {
  if (!searchTerm.trim()) return logs;
  const query = searchTerm.toLowerCase().trim();
  return logs.filter((log) => matchFieldInMaintenance(log, query) !== null);
}

/** Orden + filtro por búsqueda de los registros de mantenimiento (FC165 F2 Slice 2.1B). */
export function useMaintenanceLogSort(
  logs: MaintenanceLog[],
  searchTerm: string
): {
  sortConfig: SortConfig;
  handleSort: (key: string) => void;
  filteredLogs: MaintenanceLog[];
} {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: null, direction: 'asc' });

  const handleSort = (key: string): void => {
    const field = key as NonNullable<SortConfig['field']>;
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredLogs = useMemo(() => {
    const sorted = applySort(logs, sortConfig);
    return applyFilter(sorted, searchTerm);
  }, [logs, sortConfig, searchTerm]);

  return { sortConfig, handleSort, filteredLogs };
}

export default useMaintenanceLogSort;

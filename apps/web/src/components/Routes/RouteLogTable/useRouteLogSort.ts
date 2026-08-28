import { useMemo, useState } from 'react';
import { UserIndustrial } from '../../../types/user';
import { FleetUnit } from '../../../types/fleet';
import { RouteLog } from './types';
import { matchFieldInRoute } from './searchMatchers';

export interface SortConfig {
  field: string | null;
  direction: 'asc' | 'desc';
}

function applyFilter(
  logs: RouteLog[],
  searchTerm: string,
  users: UserIndustrial[],
  units: FleetUnit[]
): RouteLog[] {
  if (!searchTerm.trim()) return logs;
  const query = searchTerm.toLowerCase().trim();
  return logs.filter((log) => {
    if (log.uuid?.toLowerCase() === query) return true;
    return matchFieldInRoute(log, query, users, units) !== null;
  });
}

function applySort(logs: RouteLog[], sortConfig: SortConfig): RouteLog[] {
  if (sortConfig.field === 'activo') {
    return [...logs].sort((a, b) => {
      const idA = Number(a.id || 0);
      const idB = Number(b.id || 0);
      return sortConfig.direction === 'asc' ? idA - idB : idB - idA;
    });
  }
  if (sortConfig.field === 'estado') {
    return [...logs].sort((a, b) => {
      const labelA = a.end_time ? 'FINALIZADA' : 'EN RUTA';
      const labelB = b.end_time ? 'FINALIZADA' : 'EN RUTA';
      return sortConfig.direction === 'asc'
        ? labelA.localeCompare(labelB)
        : labelB.localeCompare(labelA);
    });
  }
  if (sortConfig.field === 'mision') {
    return [...logs].sort((a, b) => {
      const dateA = a.start_time ? new Date(a.start_time).getTime() : 0;
      const dateB = b.start_time ? new Date(b.start_time).getTime() : 0;
      const timeA = Number.isNaN(dateA) ? 0 : dateA;
      const timeB = Number.isNaN(dateB) ? 0 : dateB;
      return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }
  return logs;
}

/** Filtro por búsqueda + ordenamiento (activo/estado/misión) del log de rutas (FC163 F2B4 Sub-Batch 4B-2). */
export function useRouteLogSort(
  logs: RouteLog[],
  searchTerm: string,
  users: UserIndustrial[],
  units: FleetUnit[]
): {
  sortConfig: SortConfig;
  handleSort: (key: string) => void;
  filteredLogs: RouteLog[];
} {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: null, direction: 'asc' });

  const handleSort = (key: string): void => {
    const direction: 'asc' | 'desc' =
      sortConfig.field === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ field: key, direction });
  };

  const filteredLogs = useMemo(() => {
    const filtered = applyFilter(logs, searchTerm, users, units);
    return applySort(filtered, sortConfig);
  }, [logs, searchTerm, users, units, sortConfig]);

  return { sortConfig, handleSort, filteredLogs };
}

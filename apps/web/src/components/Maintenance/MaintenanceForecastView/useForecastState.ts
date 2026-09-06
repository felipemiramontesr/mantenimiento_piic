import React, { useEffect, useState } from 'react';
import { MaintenanceForecastRow } from '../../../types/maintenance';
import api from '../../../api/client';
import { useSovereignLayout, SearchSuggestion } from '../../../context/SovereignLayoutContext';
import { SERVICE_LABELS, SERVICE_WEIGHT, SortField } from './constants';
import { matchFieldInForecast } from './helpers';

interface UseMaintenanceForecastDataResult {
  data: MaintenanceForecastRow[];
  loading: boolean;
  error: string | null;
}

/** Fetch inicial del pronóstico de mantenimiento
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceForecastView). */
function useMaintenanceForecastData(): UseMaintenanceForecastDataResult {
  const [data, setData] = useState<MaintenanceForecastRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get('/maintenance/forecast')
      .then((res) => {
        if (res.data.success) setData(res.data.data as MaintenanceForecastRow[]);
      })
      .catch(() => setError('Error al recuperar pronósticos de mantenimiento.'))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

/** Registro de búsqueda universal para el pronóstico
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceForecastView). */
function useMaintenanceForecastSearch(data: MaintenanceForecastRow[]): void {
  const { setSearchTerm, setSearchConfig } = useSovereignLayout();

  useEffect(() => {
    setSearchConfig({
      placeholder: 'Buscar por unidad, depto o tipo de servicio...',
      // `data: MaintenanceForecastRow[]` no opcional (useState([])) -- el
      // fallback `|| []` era, por tipo, inalcanzable (FC165 F3 Slice3.3
      // Lote A, purga sintáctica).
      getSuggestions: (term: string): SearchSuggestion[] => {
        const query = term.toLowerCase().trim();
        return data
          .map((row): SearchSuggestion | null => {
            const match = matchFieldInForecast(row, query);
            if (!match) return null;
            return {
              id: row.unitId,
              title: row.unitId,
              subtitle: SERVICE_LABELS[row.projectedServiceType],
              metaLabel: match.label,
              metaValue: match.value,
              rawItem: row,
            };
          })
          .filter((s): s is SearchSuggestion => s !== null);
      },
      onSuggestionSelect: (suggestion) => {
        setSearchTerm(suggestion.title);
      },
    });

    return (): void => {
      setSearchConfig(null);
    };
  }, [data, setSearchConfig, setSearchTerm]);

  // 🛡️ Auto-cleanup Search Term on Unmount
  useEffect(() => (): void => setSearchTerm(''), [setSearchTerm]);
}

interface UseMaintenanceForecastSortResult {
  filtered: MaintenanceForecastRow[];
  sortConfig: { field: SortField; direction: 'asc' | 'desc' };
  handleSort: (key: string) => void;
}

/** Ordenamiento + filtrado por término de búsqueda del pronóstico
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceForecastView). */
function useMaintenanceForecastSort(
  data: MaintenanceForecastRow[],
  searchTerm: string
): UseMaintenanceForecastSortResult {
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: 'asc' | 'desc' }>({
    field: null,
    direction: 'asc',
  });

  const handleSort = (key: string): void => {
    const field = key as keyof MaintenanceForecastRow;
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sorted = React.useMemo(() => {
    if (!sortConfig.field) return data;
    const f = sortConfig.field;
    return [...data].sort((a, b) => {
      const valA = f === 'projectedServiceType' ? SERVICE_WEIGHT[a.projectedServiceType] : a[f];
      const valB = f === 'projectedServiceType' ? SERVICE_WEIGHT[b.projectedServiceType] : b[f];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA ?? '');
      const strB = String(valB ?? '');
      return sortConfig.direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [data, sortConfig]);

  const filtered = React.useMemo(() => {
    if (!searchTerm.trim()) return sorted;
    const query = searchTerm.toLowerCase().trim();
    return sorted.filter((row) => matchFieldInForecast(row, query) !== null);
  }, [sorted, searchTerm]);

  return { filtered, sortConfig, handleSort };
}

export interface UseMaintenanceForecastStateResult {
  filtered: MaintenanceForecastRow[];
  loading: boolean;
  error: string | null;
  sortConfig: { field: SortField; direction: 'asc' | 'desc' };
  handleSort: (key: string) => void;
}

/** Compone fetch + búsqueda + orden/filtro del pronóstico
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceForecastView). */
export function useMaintenanceForecastState(): UseMaintenanceForecastStateResult {
  const { searchTerm } = useSovereignLayout();
  const { data, loading, error } = useMaintenanceForecastData();
  useMaintenanceForecastSearch(data);
  const { filtered, sortConfig, handleSort } = useMaintenanceForecastSort(data, searchTerm);
  return { filtered, loading, error, sortConfig, handleSort };
}

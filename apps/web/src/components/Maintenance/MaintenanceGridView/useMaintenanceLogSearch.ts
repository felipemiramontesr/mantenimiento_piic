import { useEffect } from 'react';
import { MaintenanceLog } from '../../../types/maintenance';
import { useSovereignLayout, SearchSuggestion } from '../../../context/SovereignLayoutContext';
import { matchFieldInMaintenance } from './searchMatchers';

function buildSuggestion(log: MaintenanceLog, query: string): SearchSuggestion | null {
  const match = matchFieldInMaintenance(log, query);
  if (!match) return null;
  return {
    id: log.id.toString(),
    title: log.unit_id,
    subtitle: log.service_type === 'MINOR_MINING' ? 'Servicio Menor' : 'Preventivo',
    metaLabel: match.label,
    metaValue: match.value,
    rawItem: log,
  };
}

/** Registra/limpia la búsqueda universal para el grid de mantenimiento (FC165 F2 Slice 2.1B). */
export function useMaintenanceLogSearch(logs: MaintenanceLog[]): void {
  const { setSearchTerm, setSearchConfig } = useSovereignLayout();

  useEffect(() => {
    setSearchConfig({
      placeholder: 'Buscar por unidad, placas o tipo de servicio...',
      getSuggestions: (term: string): SearchSuggestion[] => {
        const query = term.toLowerCase().trim();
        return (logs || [])
          .map((log) => buildSuggestion(log, query))
          .filter((s): s is SearchSuggestion => s !== null);
      },
      onSuggestionSelect: (suggestion): void => setSearchTerm(suggestion.title),
    });

    return (): void => setSearchConfig(null);
  }, [logs, setSearchConfig, setSearchTerm]);

  useEffect(() => (): void => setSearchTerm(''), [setSearchTerm]);
}

export default useMaintenanceLogSearch;

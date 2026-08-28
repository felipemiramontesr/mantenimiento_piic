import { useEffect } from 'react';
import { UserIndustrial } from '../../../types/user';
import { FleetUnit } from '../../../types/fleet';
import { useSovereignLayout, SearchSuggestion } from '../../../context/SovereignLayoutContext';
import { RouteLog } from './types';
import { matchFieldInRoute } from './searchMatchers';

function buildRouteSuggestion(
  log: RouteLog,
  query: string,
  users: UserIndustrial[],
  units: FleetUnit[]
): SearchSuggestion | null {
  const match = matchFieldInRoute(log, query, users, units);
  if (!match) return null;
  const operator = users.find((u) => u.id === String(log.operator_id));
  return {
    id: log.uuid,
    title: `${log.unit_id} ➔ ${log.destination}`,
    subtitle: operator?.fullName || 'Operador General',
    metaLabel: match.label,
    metaValue: match.value,
    rawItem: log,
  };
}

/** Registra/limpia la búsqueda universal para el log de rutas (FC163 F2B4 Sub-Batch 4B-2). */
export function useRouteLogSearch(
  logs: RouteLog[],
  users: UserIndustrial[],
  units: FleetUnit[]
): void {
  const { setSearchTerm, setSearchConfig } = useSovereignLayout();

  useEffect(() => {
    setSearchConfig({
      placeholder: 'Buscar por unidad, operador, origen, destino o marca...',
      getSuggestions: (term: string): SearchSuggestion[] => {
        const query = term.toLowerCase().trim();
        return (logs || [])
          .map((log) => buildRouteSuggestion(log, query, users, units))
          .filter((s): s is SearchSuggestion => s !== null);
      },
      onSuggestionSelect: (suggestion) => {
        setSearchTerm((suggestion.rawItem as RouteLog).unit_id);
      },
    });

    return (): void => setSearchConfig(null);
  }, [logs, users, units, setSearchConfig, setSearchTerm]);

  useEffect(() => (): void => setSearchTerm(''), [setSearchTerm]);
}

export default useRouteLogSearch;

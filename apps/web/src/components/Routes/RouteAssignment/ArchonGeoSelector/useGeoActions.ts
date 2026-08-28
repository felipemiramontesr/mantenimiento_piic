import { useCallback } from 'react';
import api from '../../../../api/client';
import { StateOption, MunicipioOption, NeighborhoodOption } from './types';

export interface GeoChangeHandlers {
  handleStateChange: (stateId: number) => void;
  handleMunicipioChange: (municipalityId: number) => void;
  handleNeighborhoodChange: (neighborhoodId: number, neighborhoodName: string) => Promise<void>;
}

/** Handlers de cambio de estado/municipio/colonia con reseteo en cascada (FC163 F2B5). */
function useGeoChangeHandlers(
  states: StateOption[],
  selectedState: number | undefined,
  selectedMunicipality: number | undefined,
  setSelectedState: (v: number | undefined) => void,
  setSelectedMunicipality: (v: number | undefined) => void,
  onChange: (neighborhoodId: number | undefined, destinationString: string) => void
): GeoChangeHandlers {
  const handleStateChange = useCallback(
    (stateId: number): void => {
      setSelectedState(stateId);
      setSelectedMunicipality(undefined);
      onChange(undefined, '');
    },
    [onChange, setSelectedState, setSelectedMunicipality]
  );

  const handleMunicipioChange = useCallback(
    (municipalityId: number): void => {
      setSelectedMunicipality(municipalityId);
      onChange(undefined, '');
    },
    [onChange, setSelectedMunicipality]
  );

  const handleNeighborhoodChange = useCallback(
    async (neighborhoodId: number, neighborhoodName: string): Promise<void> => {
      try {
        const stateObj = states.find((s) => s.id === selectedState);
        const resMun = await api.get(`/geolocation/states/${selectedState}/municipalities`);
        const { data } = resMun;
        const munList = data?.data || data || [];
        const munObj = munList.find((m: MunicipioOption) => m.id === selectedMunicipality);
        const destinationString = `${neighborhoodName}, ${munObj?.name || ''}, ${
          stateObj?.name || ''
        }`;
        onChange(neighborhoodId, destinationString);
      } catch {
        onChange(neighborhoodId, neighborhoodName);
      }
    },
    [selectedState, selectedMunicipality, states, onChange]
  );

  return { handleStateChange, handleMunicipioChange, handleNeighborhoodChange };
}

export interface GeoSearchCallbacks {
  searchStates: (search: string) => Promise<StateOption[]>;
  searchMunicipalities: (search: string) => Promise<MunicipioOption[]>;
  searchNeighborhoods: (search: string) => Promise<NeighborhoodOption[]>;
}

/** Búsquedas remotas (debounced por el combobox) de estado/municipio/colonia (FC163 F2B5). */
function useGeoSearchCallbacks(
  states: StateOption[],
  selectedState: number | undefined,
  selectedMunicipality: number | undefined
): GeoSearchCallbacks {
  const searchStates = useCallback(
    async (search: string): Promise<StateOption[]> => {
      const term = search.toLowerCase().trim();
      if (!term) return states;
      return states.filter((s) => s.name.toLowerCase().includes(term));
    },
    [states]
  );

  const searchMunicipalities = useCallback(
    async (search: string): Promise<MunicipioOption[]> => {
      if (!selectedState) return [];
      try {
        const res = await api.get(`/geolocation/states/${selectedState}/municipalities`, {
          params: { search },
        });
        const { data } = res;
        return data?.data || data || [];
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        return [];
      }
    },
    [selectedState]
  );

  const searchNeighborhoods = useCallback(
    async (search: string): Promise<NeighborhoodOption[]> => {
      if (!selectedMunicipality) return [];
      try {
        const res = await api.get(
          `/geolocation/municipalities/${selectedMunicipality}/neighborhoods`,
          {
            params: { search },
          }
        );
        const { data } = res;
        return data?.data || data || [];
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        return [];
      }
    },
    [selectedMunicipality]
  );

  return { searchStates, searchMunicipalities, searchNeighborhoods };
}

export type GeoActions = GeoChangeHandlers & GeoSearchCallbacks;

/** Handlers de cambio + búsquedas remotas para el selector geográfico (FC163 F2B5). */
export function useGeoActions(
  states: StateOption[],
  selectedState: number | undefined,
  selectedMunicipality: number | undefined,
  setSelectedState: (v: number | undefined) => void,
  setSelectedMunicipality: (v: number | undefined) => void,
  onChange: (neighborhoodId: number | undefined, destinationString: string) => void
): GeoActions {
  const changeHandlers = useGeoChangeHandlers(
    states,
    selectedState,
    selectedMunicipality,
    setSelectedState,
    setSelectedMunicipality,
    onChange
  );
  const searchCallbacks = useGeoSearchCallbacks(states, selectedState, selectedMunicipality);
  return { ...changeHandlers, ...searchCallbacks };
}

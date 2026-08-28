import { useState, useEffect } from 'react';
import api from '../../../../api/client';
import { archonCache } from '../../../../utils/archonCache';
import { StateOption, MunicipioOption, NeighborhoodOption } from './types';

async function fetchStates(): Promise<StateOption[]> {
  const cached = archonCache.get<StateOption[]>('geo_states');
  if (cached) return cached;
  const res = await api.get('/geolocation/states');
  const data = res.data?.data || res.data || [];
  archonCache.set('geo_states', data);
  return data;
}

interface StatesAndMunicipalities {
  states: StateOption[];
  municipalities: MunicipioOption[];
}

/** Carga estados + municipios dependientes del estado seleccionado (FC163 F2B5). */
function useStatesAndMunicipalities(selectedState: number | undefined): StatesAndMunicipalities {
  const [states, setStates] = useState<StateOption[]>([]);
  const [municipalities, setMunicipalities] = useState<MunicipioOption[]>([]);

  useEffect((): void => {
    fetchStates()
      .then(setStates)
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load states', err);
      });
  }, []);

  useEffect((): void => {
    if (!selectedState) {
      setMunicipalities([]);
      return;
    }
    api
      .get(`/geolocation/states/${selectedState}/municipalities`)
      .then((res) => setMunicipalities(res.data?.data || res.data || []))
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load municipalities', err);
      });
  }, [selectedState]);

  return { states, municipalities };
}

interface HydrationResult {
  loadingHydration: boolean;
  hydratedNeighborhood: NeighborhoodOption | undefined;
}

/** Hidrata estado/municipio/colonia a partir de un neighborhoodId inicial (FC163 F2B5). */
function useNeighborhoodHydration(
  value: number | undefined,
  setSelectedState: (v: number | undefined) => void,
  setSelectedMunicipality: (v: number | undefined) => void
): HydrationResult {
  const [loadingHydration, setLoadingHydration] = useState(false);
  const [hydratedNeighborhood, setHydratedNeighborhood] = useState<NeighborhoodOption | undefined>(
    undefined
  );

  useEffect((): void => {
    if (!value) {
      setSelectedState(undefined);
      setSelectedMunicipality(undefined);
      setHydratedNeighborhood(undefined);
      return;
    }
    setLoadingHydration(true);
    api
      .get(`/geolocation/neighborhoods/${value}`)
      .then((res) => {
        const { data } = res;
        if (data) {
          setSelectedState(data.stateId);
          setSelectedMunicipality(data.municipalityId);
          setHydratedNeighborhood({ id: data.id, name: data.name, postalCode: data.postalCode });
        }
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Failed to hydrate neighborhood details', err);
      })
      .finally(() => setLoadingHydration(false));
  }, [value]);

  return { loadingHydration, hydratedNeighborhood };
}

export interface GeoHierarchyData {
  states: StateOption[];
  selectedState: number | undefined;
  setSelectedState: (v: number | undefined) => void;
  selectedMunicipality: number | undefined;
  setSelectedMunicipality: (v: number | undefined) => void;
  municipalities: MunicipioOption[];
  loadingHydration: boolean;
  hydratedNeighborhood: NeighborhoodOption | undefined;
}

/** Carga estados, municipios dependientes del estado, e hidrata la selección desde un valor inicial (FC163 F2B5). */
export function useGeoHierarchyData(value: number | undefined): GeoHierarchyData {
  const [selectedState, setSelectedState] = useState<number | undefined>(undefined);
  const [selectedMunicipality, setSelectedMunicipality] = useState<number | undefined>(undefined);
  const { states, municipalities } = useStatesAndMunicipalities(selectedState);
  const { loadingHydration, hydratedNeighborhood } = useNeighborhoodHydration(
    value,
    setSelectedState,
    setSelectedMunicipality
  );

  return {
    states,
    selectedState,
    setSelectedState,
    selectedMunicipality,
    setSelectedMunicipality,
    municipalities,
    loadingHydration,
    hydratedNeighborhood,
  };
}

import { useEffect, useState } from 'react';
import api from '../../../api/client';
import { FleetUnit } from '../../../types/fleet';

/** Carga la lista de unidades para el selector del formulario (FC163 F2B3, split de EgressRegistrationModal). */
export function useEgressUnits(): FleetUnit[] {
  const [units, setUnits] = useState<FleetUnit[]>([]);

  useEffect((): void => {
    api
      .get<{ success: boolean; data: FleetUnit[] }>('/fleet')
      .then((res) => setUnits(res.data.data ?? []))
      .catch((): void => setUnits([]));
  }, []);

  return units;
}

export default useEgressUnits;

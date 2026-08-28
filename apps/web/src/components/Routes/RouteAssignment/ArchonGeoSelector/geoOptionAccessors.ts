import { StateOption, MunicipioOption, NeighborhoodOption } from './types';

/** Etiqueta visible de una opción de estado (FC163 F2B5). */
export const getStateLabel = (o: StateOption): string => o.name;
/** Valor (id) de una opción de estado (FC163 F2B5). */
export const getStateValue = (o: StateOption): number => o.id;

/** Etiqueta visible de una opción de municipio (FC163 F2B5). */
export const getMunicipioLabel = (o: MunicipioOption): string => o.name;
/** Valor (id) de una opción de municipio (FC163 F2B5). */
export const getMunicipioValue = (o: MunicipioOption): number => o.id;

/** Etiqueta visible de una opción de colonia (FC163 F2B5). */
export const getNeighborhoodLabel = (o: NeighborhoodOption): string => o.name;
/** Valor (id) de una opción de colonia (FC163 F2B5). */
export const getNeighborhoodValue = (o: NeighborhoodOption): number => o.id;
/** Texto secundario (código postal) de una opción de colonia (FC163 F2B5). */
export const getNeighborhoodSecondary = (o: NeighborhoodOption): string | undefined =>
  o.postalCode ? `CP: ${o.postalCode}` : undefined;

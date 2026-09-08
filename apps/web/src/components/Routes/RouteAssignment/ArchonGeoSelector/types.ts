import type { ReactNode } from 'react';

export interface StateOption {
  id: number;
  name: string;
}

export interface MunicipioOption {
  id: number;
  name: string;
}

export interface NeighborhoodOption {
  id: number;
  name: string;
  postalCode: string;
  city?: string;
}

export interface ArchonGeoSelectorProps {
  value?: number; // destinationNeighborhoodId
  onChange: (neighborhoodId: number | undefined, destinationString: string) => void;
  disabled?: boolean;
  originNode?: ReactNode;
}

export interface ComboboxProps<T> {
  value?: number;
  onChange: (id: number, name: string) => void;
  onSearch: (query: string) => Promise<T[]>;
  placeholder: string | undefined;
  disabled?: boolean;
  getOptionLabel: (opt: T) => string;
  getOptionValue: (opt: T) => number;
  getOptionSecondary?: (opt: T) => string | undefined;
  initialOptions?: T[];
}

/** Los 3 accesores de forma de opción de `ComboboxProps<T>`, agrupados
 * (FC166 Track D S107) para que `useComboboxData` no exceda el máximo de
 * 7 parámetros — mismo contrato, solo empaquetado en un objeto. */
export interface ComboboxAccessors<T> {
  getOptionValue: (opt: T) => number;
  getOptionLabel: (opt: T) => string;
  getOptionSecondary?: (opt: T) => string | undefined;
}

export interface ComboboxOptionItemData {
  key: string;
  id: number;
  label: string;
  secondary?: string;
  isSelected: boolean;
}

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

export interface ComboboxOptionItemData {
  key: string;
  id: number;
  label: string;
  secondary?: string;
  isSelected: boolean;
}

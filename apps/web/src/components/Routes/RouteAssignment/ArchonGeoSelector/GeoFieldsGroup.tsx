import React from 'react';
import { Combobox } from './Combobox';
import { GeoHierarchyData } from './useGeoHierarchyData';
import { GeoActions } from './useGeoActions';
import {
  getStateLabel,
  getStateValue,
  getMunicipioLabel,
  getMunicipioValue,
  getNeighborhoodLabel,
  getNeighborhoodValue,
  getNeighborhoodSecondary,
} from './geoOptionAccessors';

interface FieldLabelProps {
  children: React.ReactNode;
}

/** Etiqueta decorativa (no asociable, el control es un Combobox custom) de un campo geográfico (FC163 F2B5). */
function FieldLabel({ children }: FieldLabelProps): React.JSX.Element {
  return (
    <span className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
      {children}
    </span>
  );
}

interface StateFieldProps {
  hierarchy: GeoHierarchyData;
  actions: GeoActions;
  disabled: boolean;
  label: string;
}

/** Campo combobox de Estado (etiquetado "Destino" cuando originNode está presente) (FC163 F2B5). */
function StateField({ hierarchy, actions, disabled, label }: StateFieldProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <Combobox<{ id: number; name: string }>
        value={hierarchy.selectedState}
        onChange={actions.handleStateChange}
        onSearch={actions.searchStates}
        initialOptions={hierarchy.states}
        disabled={disabled || hierarchy.loadingHydration}
        placeholder="Buscar Estado..."
        getOptionLabel={getStateLabel}
        getOptionValue={getStateValue}
      />
    </div>
  );
}

interface MunicipioFieldProps {
  hierarchy: GeoHierarchyData;
  actions: GeoActions;
  disabled: boolean;
}

/** Campo combobox de Municipio (FC163 F2B5). */
function MunicipioField({ hierarchy, actions, disabled }: MunicipioFieldProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      <FieldLabel>Municipio</FieldLabel>
      <Combobox<{ id: number; name: string }>
        value={hierarchy.selectedMunicipality}
        onChange={actions.handleMunicipioChange}
        onSearch={actions.searchMunicipalities}
        initialOptions={hierarchy.municipalities}
        disabled={disabled || !hierarchy.selectedState || hierarchy.loadingHydration}
        placeholder="Buscar Municipio..."
        getOptionLabel={getMunicipioLabel}
        getOptionValue={getMunicipioValue}
      />
    </div>
  );
}

interface NeighborhoodFieldProps {
  hierarchy: GeoHierarchyData;
  actions: GeoActions;
  disabled: boolean;
  neighborhoodValue: number | undefined;
}

/** Campo combobox de Colonia / Código Postal (FC163 F2B5). */
function NeighborhoodField({
  hierarchy,
  actions,
  disabled,
  neighborhoodValue,
}: NeighborhoodFieldProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      <FieldLabel>Colonia / Código Postal</FieldLabel>
      <Combobox<{ id: number; name: string; postalCode: string; city?: string }>
        value={neighborhoodValue}
        onChange={actions.handleNeighborhoodChange}
        onSearch={actions.searchNeighborhoods}
        initialOptions={
          hierarchy.hydratedNeighborhood ? [hierarchy.hydratedNeighborhood] : undefined
        }
        disabled={disabled || !hierarchy.selectedMunicipality || hierarchy.loadingHydration}
        placeholder="Buscar Colonia..."
        getOptionLabel={getNeighborhoodLabel}
        getOptionValue={getNeighborhoodValue}
        getOptionSecondary={getNeighborhoodSecondary}
      />
    </div>
  );
}

export interface GeoFieldsGroupProps {
  disabled: boolean;
  neighborhoodValue: number | undefined;
  hierarchy: GeoHierarchyData;
  actions: GeoActions;
  stateLabel: string;
}

/** Estado + Municipio + Colonia: los 3 combobox geográficos, reusados en ambos layouts (FC163 F2B5). */
export function GeoFieldsGroup({
  disabled,
  neighborhoodValue,
  hierarchy,
  actions,
  stateLabel,
}: GeoFieldsGroupProps): React.JSX.Element {
  return (
    <>
      <StateField hierarchy={hierarchy} actions={actions} disabled={disabled} label={stateLabel} />
      <MunicipioField hierarchy={hierarchy} actions={actions} disabled={disabled} />
      <NeighborhoodField
        hierarchy={hierarchy}
        actions={actions}
        disabled={disabled}
        neighborhoodValue={neighborhoodValue}
      />
    </>
  );
}

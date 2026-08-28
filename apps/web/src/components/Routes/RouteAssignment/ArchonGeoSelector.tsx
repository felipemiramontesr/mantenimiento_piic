import React from 'react';
import { ArchonGeoSelectorProps } from './ArchonGeoSelector/types';
import { useGeoHierarchyData } from './ArchonGeoSelector/useGeoHierarchyData';
import { useGeoActions } from './ArchonGeoSelector/useGeoActions';
import { GeoFieldsGroup } from './ArchonGeoSelector/GeoFieldsGroup';

export default function ArchonGeoSelector({
  value,
  onChange,
  disabled = false,
  originNode,
}: ArchonGeoSelectorProps): React.JSX.Element {
  const hierarchy = useGeoHierarchyData(value);
  const actions = useGeoActions(
    hierarchy.states,
    hierarchy.selectedState,
    hierarchy.selectedMunicipality,
    hierarchy.setSelectedState,
    hierarchy.setSelectedMunicipality,
    onChange
  );

  if (originNode) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">{originNode}</div>
        <GeoFieldsGroup
          disabled={disabled}
          neighborhoodValue={value}
          hierarchy={hierarchy}
          actions={actions}
          stateLabel="Destino"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <GeoFieldsGroup
        disabled={disabled}
        neighborhoodValue={value}
        hierarchy={hierarchy}
        actions={actions}
        stateLabel="Estado"
      />
    </div>
  );
}

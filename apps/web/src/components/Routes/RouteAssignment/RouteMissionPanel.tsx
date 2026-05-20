import React from 'react';
import { MapPin } from 'lucide-react';
import ArchonSelect from '../../ArchonSelect';
import ArchonGeoSelector from './ArchonGeoSelector';
import { RouteAssignmentPanelProps } from './types';

import { CatalogOption } from '../../../types/fleet';

interface RouteMissionPanelProps extends RouteAssignmentPanelProps {
  origins: CatalogOption[];
}

/**
 * 🔱 Archon Panel: Route Mission (Fase II)
 * Handles destination, origin and mission description.
 */
const RouteMissionPanel: React.FC<RouteMissionPanelProps> = ({ formData, updateForm, origins }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <div className="bg-[#f2b705] p-2 rounded-[4px]">
        <MapPin size={20} className="text-[#0f2a44]" />
      </div>
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-50">
          Fase II
        </span>
        <h3 className="text-[14px] font-black uppercase tracking-tight text-[#0f2a44]">
          Misión y Destino
        </h3>
      </div>
    </div>

    <ArchonGeoSelector
      value={formData.destinationColoniaId}
      onChange={(coloniaId: number | undefined, destStr: string): void => {
        updateForm({
          destinationColoniaId: coloniaId,
          destination: destStr,
        });
      }}
      originNode={
        <>
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
            Origen
          </label>
          <ArchonSelect
            options={origins.map((o) => ({ value: o.label, label: o.label }))}
            value={formData.origin}
            onChange={(val): void => updateForm({ origin: val })}
            icon={MapPin}
          />
        </>
      }
    />
  </div>
);

export default React.memo(RouteMissionPanel);

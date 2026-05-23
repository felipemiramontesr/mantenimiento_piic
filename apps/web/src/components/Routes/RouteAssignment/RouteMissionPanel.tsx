import React from 'react';
import { MapPin, Home, Hash } from 'lucide-react';
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
      value={formData.destinationNeighborhoodId}
      onChange={(neighborhoodId: number | undefined, destStr: string): void => {
        updateForm({
          destinationNeighborhoodId: neighborhoodId,
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

    {/* Dirección de Destino Detallada (Fila 3) */}
    <div className="grid grid-cols-4 gap-4 pt-2">
      <div className="col-span-2 space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
          Calle
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Calle o Avenida..."
            value={formData.calle || ''}
            onChange={(e): void => updateForm({ calle: e.target.value })}
            className="peer w-full h-11 bg-[#0f2a44]/5 border-b-2 border-[#0f2a44]/10 focus:border-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pl-10 text-[13px] font-bold text-[#0f2a44] placeholder:text-[#0f2a44]/30 outline-none transition-all duration-300 rounded-[4px]"
          />
          <Home
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30 peer-focus:text-[#f2b705] transition-colors pointer-events-none"
          />
        </div>
      </div>

      <div className="col-span-1 space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
          Número
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Ext."
            value={formData.numero || ''}
            onChange={(e): void => updateForm({ numero: e.target.value })}
            className="peer w-full h-11 bg-[#0f2a44]/5 border-b-2 border-[#0f2a44]/10 focus:border-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pl-10 text-[13px] font-bold text-[#0f2a44] placeholder:text-[#0f2a44]/30 outline-none transition-all duration-300 rounded-[4px]"
          />
          <Hash
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30 peer-focus:text-[#f2b705] transition-colors pointer-events-none"
          />
        </div>
      </div>

      <div className="col-span-1 space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
          Num. Int.
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Opcional"
            value={formData.numeroInterior || ''}
            onChange={(e): void => updateForm({ numeroInterior: e.target.value })}
            className="peer w-full h-11 bg-[#0f2a44]/5 border-b-2 border-[#0f2a44]/10 focus:border-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pl-10 text-[13px] font-bold text-[#0f2a44] placeholder:text-[#0f2a44]/30 outline-none transition-all duration-300 rounded-[4px]"
          />
          <Hash
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30 peer-focus:text-[#f2b705] transition-colors pointer-events-none"
          />
        </div>
      </div>
    </div>
  </div>
);

export default React.memo(RouteMissionPanel);

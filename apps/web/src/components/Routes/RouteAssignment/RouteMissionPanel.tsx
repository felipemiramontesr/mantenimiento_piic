import React from 'react';
import { MapPin } from 'lucide-react';
import ArchonSelect from '../../ArchonSelect';
import { RouteAssignmentPanelProps } from './types';

import { CatalogOption } from '../../../types/fleet';

interface RouteMissionPanelProps extends RouteAssignmentPanelProps {
  origins: CatalogOption[];
}

/**
 * 🔱 Archon Panel: Route Mission (Fase II)
 * Handles destination, origin and mission description.
 */
const RouteMissionPanel: React.FC<RouteMissionPanelProps> = ({
  formData,
  updateForm,
  isEdit,
  origins,
}) => (
  <div className="space-y-8 pt-8 border-t border-[#0f2a44]/5">
    <div className="flex items-center gap-3">
      <div className="bg-emerald-600 p-2 rounded-[4px]">
        <MapPin size={20} className="text-white" />
      </div>
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 opacity-50">
          Fase II
        </span>
        <h3 className="text-[14px] font-black uppercase tracking-tight text-[#0f2a44]">
          Misión y Destino
        </h3>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
          Origen
        </label>
        <ArchonSelect
          options={origins.map((o) => ({ value: o.label, label: o.label }))}
          value={formData.origin}
          onChange={(val): void => updateForm({ origin: val })}
          icon={MapPin}
          disabled={isEdit}
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
          Destino
        </label>
        <input
          type="text"
          placeholder="Ej: Mina Nivel 400"
          value={formData.destination}
          onChange={(e): void => updateForm({ destination: e.target.value })}
          className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-emerald-500 p-3 text-xs font-bold text-[#0f2a44] outline-none transition-colors rounded-[4px] disabled:opacity-50"
          disabled={isEdit}
        />
      </div>
    </div>

    <div className="space-y-2">
      <textarea
        rows={2}
        placeholder="Observaciones de la misión..."
        value={formData.description}
        onChange={(e): void => updateForm({ description: e.target.value })}
        className="w-full bg-white border-2 border-[#0f2a44]/5 focus:border-emerald-500 p-3 text-xs font-bold text-[#0f2a44] outline-none transition-colors resize-none rounded-[4px] disabled:opacity-50"
        disabled={isEdit}
      />
    </div>
  </div>
);

export default React.memo(RouteMissionPanel);

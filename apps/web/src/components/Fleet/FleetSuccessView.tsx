import React from 'react';
import { CheckCircle } from 'lucide-react';
import { CreateFleetUnit } from '../../types/fleet';

/**
 * 🔱 Archon Component: FleetSuccessView
 * Implementation: Silicon Valley Standard (SRP)
 * v.17.0.0 Refined
 */

interface FleetSuccessViewProps {
  formData: CreateFleetUnit;
}

const FleetSuccessView: React.FC<FleetSuccessViewProps> = ({
  formData,
}: FleetSuccessViewProps): React.JSX.Element => (
  <div className="w-full flex flex-col items-center justify-center py-24 text-center space-y-12 animate-in zoom-in-95 duration-500 bg-white glass-card-pro p-20 rounded-[4px] shadow-2xl border-t-8 border-emerald-500">
    {/* 💎 ELEGANT SUCCESS ICON */}
    <div className="relative">
      <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-200 shadow-sm">
        <CheckCircle color="#10b981" size={48} strokeWidth={2} />
      </div>
    </div>

    <div className="space-y-4">
      <h3 className="text-3xl font-black text-[#0f2a44] tracking-tight uppercase">
        Unidad Registrada con Éxito
      </h3>
      <p className="text-[#0f2a44] text-lg opacity-60 font-medium max-w-lg mx-auto leading-relaxed">
        El activo <span className="text-[#f2b705] font-bold">{formData.id}</span> ha sido
        incorporado al protocolo de mantenimiento soberano de Archon.
      </p>
    </div>
  </div>
);

export default FleetSuccessView;

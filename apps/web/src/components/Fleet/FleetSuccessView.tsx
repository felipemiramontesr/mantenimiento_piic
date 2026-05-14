import React from 'react';
import { CheckCircle } from 'lucide-react';
import { CreateFleetUnit } from '../../types/fleet';

/**
 * 🔱 Archon Component: FleetSuccessView
 * Implementation: Silicon Valley Standard (SRP)
 * v.78.100.105 - Forensic Purge (Zero-Noise Compliance)
 * Refactor: 100% Pure Tailwind & Sovereign Card Architecture.
 */

interface FleetSuccessViewProps {
  formData: CreateFleetUnit;
}

const FleetSuccessView: React.FC<FleetSuccessViewProps> = ({
  formData,
}: FleetSuccessViewProps): React.JSX.Element => (
  <div className="w-full flex flex-col items-center justify-center py-24 text-center space-y-12 animate-in zoom-in-95 duration-500 bg-white card-archon-sovereign p-20 rounded-[4px] border-t-8 border-emerald-500">
    <CheckCircle
      size={80}
      strokeWidth={2}
      className="text-emerald-500 animate-in zoom-in duration-500"
    />

    <div className="space-y-4">
      <h3 className="text-3xl font-black text-pinnacle-navy tracking-tight uppercase">
        Unidad Registrada con Éxito
      </h3>
      <p className="text-pinnacle-navy text-lg opacity-60 font-medium max-w-lg mx-auto leading-relaxed">
        El activo <span className="text-pinnacle-yellow font-bold">{formData.id}</span> ha sido
        incorporado al protocolo de mantenimiento soberano de Archon.
      </p>
    </div>
  </div>
);

export default FleetSuccessView;

import React from 'react';
import { X, DollarSign } from 'lucide-react';

export interface EgressModalHeaderProps {
  onClose: () => void;
}

/** Título + botón cerrar del modal de egreso (FC163 F2B3, split de EgressRegistrationModal). */
export const EgressModalHeader: React.FC<EgressModalHeaderProps> = ({ onClose }) => (
  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
    <div className="flex items-center gap-2">
      <DollarSign size={16} className="text-pinnacle-navy" />
      <h2 className="text-archon-lg font-black text-pinnacle-navy uppercase tracking-[0.1em]">
        Registrar Egreso
      </h2>
    </div>
    <button
      onClick={onClose}
      className="flex items-center justify-center w-8 h-8 text-pinnacle-navy/40 hover:text-sentinel-red hover:bg-red-50 transition-all duration-200 rounded-[4px]"
    >
      <X size={16} />
    </button>
  </div>
);

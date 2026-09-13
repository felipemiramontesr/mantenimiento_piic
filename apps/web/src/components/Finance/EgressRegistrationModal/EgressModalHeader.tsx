import React from 'react';
import { X, DollarSign } from 'lucide-react';

export interface EgressModalHeaderProps {
  onClose: () => void;
}

/** Título + botón cerrar del modal de egreso (FC163 F2B3, split de EgressRegistrationModal). */
export const EgressModalHeader: React.FC<EgressModalHeaderProps> = ({ onClose }) => (
  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
    <div className="card-sovereign-header !mb-0">
      <DollarSign size={22} className="text-pinnacle-navy" />
      <h3 className="card-sovereign-title text-archon-xl opacity-100">Registrar Egreso</h3>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="flex items-center justify-center w-8 h-8 text-pinnacle-navy/40 hover:text-red-600 hover:bg-red-50 transition-all duration-200 rounded-[4px]"
    >
      <X size={16} />
    </button>
  </div>
);

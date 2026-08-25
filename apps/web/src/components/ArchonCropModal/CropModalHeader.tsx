import React from 'react';
import { X } from 'lucide-react';

export interface CropModalHeaderProps {
  onCancel: () => void;
}

/** Título + botón de cancelar del modal de encuadre (FC163 F2B2, split de ArchonCropModal). */
export const CropModalHeader: React.FC<CropModalHeaderProps> = ({ onCancel }) => (
  <div className="flex items-center justify-between">
    <span className="text-[13px] font-black text-[#0f2a44] uppercase tracking-widest">
      Encuadrar foto
    </span>
    <button
      type="button"
      onClick={onCancel}
      title="Cancelar"
      className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-700 border-0 bg-transparent outline-none transition-colors"
    >
      <X size={16} />
    </button>
  </div>
);

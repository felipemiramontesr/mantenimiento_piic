import React from 'react';
import { Check, ZoomIn, ZoomOut } from 'lucide-react';

export interface ZoomAndConfirmBarProps {
  onZoomOut: () => void;
  onZoomIn: () => void;
  onConfirm: () => void;
}

/** Botones de zoom + confirmar (FC163 F2B2, split de ArchonCropModal). */
export const ZoomAndConfirmBar: React.FC<ZoomAndConfirmBarProps> = ({
  onZoomOut,
  onZoomIn,
  onConfirm,
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onZoomOut}
        title="Alejar"
        className="flex items-center justify-center w-9 h-9 rounded-[4px] bg-slate-100 hover:bg-slate-200 border-0 outline-none text-slate-600 transition-colors"
      >
        <ZoomOut size={15} />
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        title="Acercar"
        className="flex items-center justify-center w-9 h-9 rounded-[4px] bg-slate-100 hover:bg-slate-200 border-0 outline-none text-slate-600 transition-colors"
      >
        <ZoomIn size={15} />
      </button>
    </div>
    <button
      type="button"
      onClick={onConfirm}
      data-testid="crop-confirm"
      className="flex items-center gap-2 px-5 py-2 bg-[#0f2a44] text-white text-[11px] font-black uppercase tracking-widest rounded-[4px] border-0 outline-none hover:bg-[#1a3a5c] transition-colors"
    >
      <Check size={13} />
      Confirmar
    </button>
  </div>
);

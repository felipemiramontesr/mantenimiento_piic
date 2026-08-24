import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface SlideOverHeaderProps {
  onClose: () => void;
}

/** Cabecera con título y botón de cierre (FC163 F1B-3, split Alfa 219_AN). */
export function SlideOverHeader({ onClose }: SlideOverHeaderProps): React.JSX.Element {
  return (
    <div className="p-6 bg-[#0f2a44] text-white flex items-center justify-between">
      <div className="flex items-center gap-3">
        <ShieldCheck size={20} className="text-[#f2b705]" />
        <h2 className="text-lg font-black uppercase tracking-widest">Control de Acceso</h2>
      </div>
      <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-[4px] transition-colors">
        <X size={20} />
      </button>
    </div>
  );
}

interface SlideOverTabsProps {
  view: 'list' | 'create';
  onSelectView: (v: 'list' | 'create') => void;
}

/** Navegación por pestañas (plantilla activa / registrar) (FC163 F1B-3, split Alfa 219_AN). */
export function SlideOverTabs({ view, onSelectView }: SlideOverTabsProps): React.JSX.Element {
  return (
    <div className="flex border-b border-gray-100">
      <button
        onClick={(): void => onSelectView('list')}
        className={`flex-1 py-4 text-archon-base font-black uppercase tracking-widest transition-all ${
          view === 'list'
            ? 'border-b-2 border-[#0f2a44] text-[#0f2a44]'
            : 'text-gray-300 hover:text-gray-500'
        }`}
      >
        Plantilla Activa
      </button>
      <button
        onClick={(): void => onSelectView('create')}
        className={`flex-1 py-4 text-archon-base font-black uppercase tracking-widest transition-all ${
          view === 'create'
            ? 'border-b-2 border-[#0f2a44] text-[#0f2a44]'
            : 'text-gray-300 hover:text-gray-500'
        }`}
      >
        Registrar Personal
      </button>
    </div>
  );
}

interface SlideOverBackdropProps {
  onClose: () => void;
}

/** Backdrop clickeable/teclado del slide-over (FC163 F1B-3, split Alfa 219_AN). */
export function SlideOverBackdrop({ onClose }: SlideOverBackdropProps): React.JSX.Element {
  return (
    <div
      className="absolute inset-0 bg-[#0f2a44]/40 backdrop-blur-sm transition-opacity"
      onClick={onClose}
      onKeyDown={(e: React.KeyboardEvent): void => {
        if (e.key === 'Escape') onClose();
      }}
      role="presentation"
    />
  );
}

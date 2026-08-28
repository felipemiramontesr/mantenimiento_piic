import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface LoadMoreButtonProps {
  onClick: () => void;
  loading: boolean;
}

/** Botón de paginación "cargar más" (FC163 F1B-3, split Alfa 219_AN). */
export function LoadMoreButton({ onClick, loading }: LoadMoreButtonProps): React.JSX.Element {
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="text-archon-base font-black uppercase tracking-widest text-pinnacle-navy/50 hover:text-pinnacle-navy transition-colors duration-300 flex items-center gap-2"
      >
        {loading ? 'Cargando...' : 'Cargar más'}
        <ChevronDown size={12} />
      </button>
    </div>
  );
}

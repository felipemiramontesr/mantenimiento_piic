import React from 'react';

export interface UnitSuggestionItemProps {
  unit: string;
  onSelect: (unit: string) => void;
}

/** Ítem de la lista de autocompletado de unidad (FC163 F1B, split Alfa 217_AN; movido a archivo hermano F1B-3). */
export const UnitSuggestionItem: React.FC<UnitSuggestionItemProps> = ({ unit, onSelect }) => (
  <li
    onClick={(): void => onSelect(unit)}
    onKeyDown={(e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(unit);
      }
    }}
    role="option"
    aria-selected={false}
    tabIndex={0}
    className="px-4 py-2.5 text-archon-md font-bold text-pinnacle-navy hover:bg-slate-50 cursor-pointer flex items-center justify-between uppercase tracking-tight transition-colors duration-150"
  >
    <span>{unit}</span>
    <span className="text-archon-sm font-black text-slate-400 tracking-wider">SELECCIONAR</span>
  </li>
);

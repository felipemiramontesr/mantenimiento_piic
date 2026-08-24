import React from 'react';
import type { SelectOption } from './types';

export interface ArchonSelectOptionItemProps {
  option: SelectOption;
  isSelected: boolean;
  onSelect: (value: string) => void;
}

/** Ítem individual del dropdown de ArchonSelect (FC163 F1B, split Alfa 217_AN; movido a archivo hermano F1B-2 por max-lines:400). */
export const ArchonSelectOptionItem: React.FC<ArchonSelectOptionItemProps> = ({
  option,
  isSelected,
  onSelect,
}) => (
  <div
    onClick={(e): void => {
      e.stopPropagation();
      onSelect(option.value);
    }}
    onKeyDown={(e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onSelect(option.value);
      }
    }}
    role="option"
    aria-selected={isSelected}
    tabIndex={0}
    className={`px-5 py-3 text-archon-lg font-bold cursor-pointer transition-all duration-200 border-l-[3px] flex items-center justify-between gap-4 ${
      isSelected
        ? 'border-[#f2b705] bg-[rgba(242,183,5,0.05)] text-[#f2b705]'
        : 'border-transparent text-[#0f2a44] hover:bg-[rgba(15,42,68,0.02)] hover:border-[rgba(15,42,68,0.2)]'
    }`}
  >
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="truncate">{option.label}</div>
      {option.secondaryLabel && (
        <div className="text-archon-sm font-black opacity-30 uppercase tracking-widest truncate mt-0.5">
          {option.secondaryLabel}
        </div>
      )}
    </div>
    {isSelected && (
      <div className="w-1.5 h-1.5 rounded-full bg-[#f2b705] shrink-0 shadow-[0_0_8px_rgba(242,183,5,0.6)]" />
    )}
  </div>
);

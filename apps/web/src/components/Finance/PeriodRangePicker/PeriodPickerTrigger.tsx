import React from 'react';
import { ChevronDown, Calendar } from 'lucide-react';

interface PeriodPickerTriggerProps {
  appliedLabel: string;
  isOpen: boolean;
  onToggle: () => void;
}

/** Botón disparador que muestra el rango aplicado (FC163 F2B4 Sub-Batch 4B-2). */
export function PeriodPickerTrigger({
  appliedLabel,
  isOpen,
  onToggle,
}: PeriodPickerTriggerProps): React.ReactElement {
  return (
    <div
      data-testid="period-picker-trigger-row"
      className="grid grid-cols-1 md:grid-cols-2 md:gap-10"
    >
      <div className="hidden md:block" />
      <button
        type="button"
        onClick={onToggle}
        style={{ borderTopColor: '#0f2a44' }}
        className="flex items-center justify-between h-11 px-4 bg-white border border-pinnacle-navy/5 border-t-4 rounded-[4px] shadow-pinnacle hover:shadow-pinnacle-hover hover:bg-slate-50 transition-all duration-200 outline-none cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-pinnacle-navy/40 shrink-0" />
          <span className="text-archon-md font-black text-pinnacle-navy tracking-tight">
            {appliedLabel}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-pinnacle-navy/40 transition-transform duration-300 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
    </div>
  );
}

export default PeriodPickerTrigger;

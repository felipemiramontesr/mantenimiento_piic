import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MESES } from './dateHelpers';

interface MonthNavProps {
  title: string;
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}

const NAV_BTN_CLS =
  'w-7 h-7 flex items-center justify-center rounded-[4px] text-pinnacle-navy/50 hover:bg-slate-100 hover:text-pinnacle-navy transition-all duration-200 border-none outline-none cursor-pointer bg-transparent';

/** Etiqueta del panel + navegación de mes anterior/siguiente (FC163 F2B4 Sub-Batch 4B-2). */
export function MonthNav({
  title,
  year,
  month,
  onPrev,
  onNext,
}: MonthNavProps): React.ReactElement {
  return (
    <>
      <span className="text-archon-sm font-black uppercase tracking-[0.25em] text-pinnacle-navy/40">
        {title}
      </span>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onPrev} className={NAV_BTN_CLS} title="Mes anterior">
          <ChevronLeft size={14} />
        </button>
        <span className="text-archon-lg font-black text-pinnacle-navy tracking-tight select-none">
          {MESES[month]} {year}
        </span>
        <button type="button" onClick={onNext} className={NAV_BTN_CLS} title="Mes siguiente">
          <ChevronRight size={14} />
        </button>
      </div>
    </>
  );
}

export default MonthNav;

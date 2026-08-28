import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ChevronRight } from 'lucide-react';
import { CalendarPanel } from './CalendarPanel';
import { shiftMonth, YearMonth } from './dateHelpers';
import { PeriodRangeDraftState } from './usePeriodRangeDraft';

interface CalendarPanelSlotProps {
  title: string;
  view: YearMonth;
  selected: string;
  rangeFrom: string;
  rangeTo: string;
  today: string;
  onDaySelect: (date: string) => void;
  setView: Dispatch<SetStateAction<YearMonth>>;
}

/** Envoltorio con card + navegación de mes para un panel Desde/Hasta (FC163 F2B4 Sub-Batch 4B-2). */
function CalendarPanelSlot({
  title,
  view,
  selected,
  rangeFrom,
  rangeTo,
  today,
  onDaySelect,
  setView,
}: CalendarPanelSlotProps): React.ReactElement {
  return (
    <div className="bg-white border border-slate-100 rounded-[4px] shadow-sm p-6">
      <CalendarPanel
        title={title}
        year={view.year}
        month={view.month}
        selected={selected}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        today={today}
        onDaySelect={onDaySelect}
        onPrev={(): void => setView((v) => shiftMonth(v.year, v.month, -1))}
        onNext={(): void => setView((v) => shiftMonth(v.year, v.month, 1))}
      />
    </div>
  );
}

interface ApplyFooterProps {
  error: string | null;
  onApply: () => void;
}

/** Pie con mensaje de error y botón de aplicar rango (FC163 F2B4 Sub-Batch 4B-2). */
function ApplyFooter({ error, onApply }: ApplyFooterProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-10 py-3">
      <div className="flex items-center">
        {error && <p className="text-archon-base font-bold text-sentinel-red">{error}</p>}
      </div>
      <button
        type="button"
        onClick={onApply}
        className="btn-archon-card-action !bg-pinnacle-navy text-white"
      >
        Aplicar Rango <ChevronRight size={12} className="ml-2" />
      </button>
    </div>
  );
}

interface CalendarPanelsBodyProps {
  draft: PeriodRangeDraftState;
}

/** Paneles de calendario Desde/Hasta + pie con error y botón de aplicar (FC163 F2B4 Sub-Batch 4B-2). */
export function CalendarPanelsBody({ draft }: CalendarPanelsBodyProps): React.ReactElement {
  const {
    today,
    leftView,
    rightView,
    draftFrom,
    draftTo,
    error,
    handleFromSelect,
    handleToSelect,
    handleApply,
    setLeftView,
    setRightView,
  } = draft;
  return (
    <>
      <div
        data-testid="period-picker-panels"
        className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10 py-4"
      >
        <CalendarPanelSlot
          title="Desde"
          view={leftView}
          selected={draftFrom}
          rangeFrom={draftFrom}
          rangeTo={draftTo}
          today={today}
          onDaySelect={handleFromSelect}
          setView={setLeftView}
        />
        <CalendarPanelSlot
          title="Hasta"
          view={rightView}
          selected={draftTo}
          rangeFrom={draftFrom}
          rangeTo={draftTo}
          today={today}
          onDaySelect={handleToSelect}
          setView={setRightView}
        />
      </div>
      <ApplyFooter error={error} onApply={handleApply} />
    </>
  );
}

export default CalendarPanelsBody;

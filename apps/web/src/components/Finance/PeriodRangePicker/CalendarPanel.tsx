import React from 'react';
import { MonthNav } from './MonthNav';
import { DayGrid } from './DayGrid';
import { formatLabel } from './dateHelpers';

interface PanelProps {
  title: string;
  year: number;
  month: number;
  selected: string;
  rangeFrom: string;
  rangeTo: string;
  today: string;
  onDaySelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

/** Panel de calendario individual: navegación de mes + grilla de días (FC163 F2B4 Sub-Batch 4B-2). */
export function CalendarPanel({
  title,
  year,
  month,
  selected,
  rangeFrom,
  rangeTo,
  today,
  onDaySelect,
  onPrev,
  onNext,
}: PanelProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <MonthNav title={title} year={year} month={month} onPrev={onPrev} onNext={onNext} />
      <DayGrid
        year={year}
        month={month}
        selected={selected}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        today={today}
        onDaySelect={onDaySelect}
      />
      <p className="text-archon-base font-bold text-pinnacle-navy/50 text-center mt-1 min-h-[16px]">
        {selected ? formatLabel(selected) : ''}
      </p>
    </div>
  );
}

export default CalendarPanel;

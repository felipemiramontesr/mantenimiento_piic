import React from 'react';
import { DateRange } from '../../types/finance';
import { usePeriodRangeDraft } from './PeriodRangePicker/usePeriodRangeDraft';
import { PeriodPickerTrigger } from './PeriodRangePicker/PeriodPickerTrigger';
import { CalendarPanelsBody } from './PeriodRangePicker/CalendarPanelsBody';

interface PeriodRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

/** Selector de rango de fechas con doble calendario Desde/Hasta (FC163 F2B4 Sub-Batch 4B-2). */
const PeriodRangePicker: React.FC<PeriodRangePickerProps> = ({
  value,
  onChange,
}): React.ReactElement => {
  const draft = usePeriodRangeDraft(value, onChange);

  return (
    <div className="w-full">
      {/* Trigger — col-beta del grid, mismo ancho y alineación que el card
          superior. FC 078 F3 (P1-3): <md apila a 1 columna — el widget se
          recortaba/solapaba a 360px al vivir en media columna. */}
      <PeriodPickerTrigger
        appliedLabel={draft.appliedLabel}
        isOpen={draft.isOpen}
        onToggle={draft.handleToggle}
      />
      {/* Body colapsable — FC 078 F3 (P1-3): apilado <md */}
      {draft.isOpen && <CalendarPanelsBody draft={draft} />}
    </div>
  );
};

export default PeriodRangePicker;

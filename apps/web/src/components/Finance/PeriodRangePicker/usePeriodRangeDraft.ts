import { useState, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { DateRange } from '../../../types/finance';
import {
  parseYMFromDate,
  computeAppliedLabel,
  validateDraftRange,
  todayISO,
  YearMonth,
} from './dateHelpers';

export interface PeriodRangeDraftState {
  today: string;
  isOpen: boolean;
  leftView: YearMonth;
  rightView: YearMonth;
  draftFrom: string;
  draftTo: string;
  error: string | null;
  appliedLabel: string;
  handleToggle: () => void;
  handleFromSelect: (date: string) => void;
  handleToSelect: (date: string) => void;
  handleApply: () => void;
  setLeftView: Dispatch<SetStateAction<YearMonth>>;
  setRightView: Dispatch<SetStateAction<YearMonth>>;
}

interface DraftResetSetters {
  setDraftFrom: (v: string) => void;
  setDraftTo: (v: string) => void;
  setLeftView: (v: YearMonth) => void;
  setRightView: (v: YearMonth) => void;
  setError: (v: string | null) => void;
}

function resetDraftFromValue(value: DateRange, setters: DraftResetSetters): void {
  setters.setDraftFrom(value.from);
  setters.setDraftTo(value.to);
  setters.setLeftView(parseYMFromDate(value.from));
  setters.setRightView(parseYMFromDate(value.to));
  setters.setError(null);
}

function useDraftDateSelect(
  setDate: (v: string) => void,
  setError: (v: string | null) => void
): (date: string) => void {
  return useCallback(
    (date: string): void => {
      setDate(date);
      setError(null);
    },
    [setDate, setError]
  );
}

/** Estado de borrador (vistas de mes, fechas, error) + acciones del selector de rango (FC163 F2B4 Sub-Batch 4B-2). */
export function usePeriodRangeDraft(
  value: DateRange,
  onChange: (range: DateRange) => void
): PeriodRangeDraftState {
  const today = todayISO();
  const [isOpen, setIsOpen] = useState(false);
  const [leftView, setLeftView] = useState(parseYMFromDate(value.from));
  const [rightView, setRightView] = useState(parseYMFromDate(value.to));
  const [draftFrom, setDraftFrom] = useState(value.from);
  const [draftTo, setDraftTo] = useState(value.to);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (): void => {
    if (!isOpen) {
      resetDraftFromValue(value, { setDraftFrom, setDraftTo, setLeftView, setRightView, setError });
    }
    setIsOpen((v) => !v);
  };

  const handleFromSelect = useDraftDateSelect(setDraftFrom, setError);
  const handleToSelect = useDraftDateSelect(setDraftTo, setError);

  const handleApply = (): void => {
    const validationError = validateDraftRange(draftFrom, draftTo);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onChange({ from: draftFrom, to: draftTo });
    setIsOpen(false);
  };

  const appliedLabel = computeAppliedLabel(value);

  return {
    today,
    isOpen,
    leftView,
    rightView,
    draftFrom,
    draftTo,
    error,
    appliedLabel,
    handleToggle,
    handleFromSelect,
    handleToSelect,
    handleApply,
    setLeftView,
    setRightView,
  };
}

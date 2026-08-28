import { DateRange } from '../../../types/finance';

export interface YearMonth {
  year: number;
  month: number;
}

export const MESES: readonly string[] = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const DIAS_CORTOS: readonly string[] = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

/** Días totales en un mes dado (FC163 F2B4 Sub-Batch 4B-2). */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Día de la semana (Lun=0…Dom=6) del primer día del mes (FC163 F2B4 Sub-Batch 4B-2). */
export function getFirstWeekday(year: number, month: number): number {
  const raw = new Date(year, month, 1).getDay();
  return (raw + 6) % 7; // Lun=0 … Dom=6
}

/** Formatea año/mes/día a ISO YYYY-MM-DD (FC163 F2B4 Sub-Batch 4B-2). */
export function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Fecha de hoy en formato ISO (FC163 F2B4 Sub-Batch 4B-2). */
export function todayISO(): string {
  const n = new Date();
  return toISO(n.getFullYear(), n.getMonth(), n.getDate());
}

/** Formatea una fecha ISO a etiqueta legible en es-MX (FC163 F2B4 Sub-Batch 4B-2). */
export function formatLabel(date: string): string {
  if (!date) return '—';
  const [y, m, d] = date.split('-');
  return `${Number(d)} de ${MESES[Number(m) - 1].toLowerCase()} de ${y}`;
}

/** Extrae año/mes de una fecha ISO, con fallback al mes actual (FC163 F2B4 Sub-Batch 4B-2). */
export function parseYMFromDate(date: string): YearMonth {
  const parts = date.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  if (!date || Number.isNaN(year) || Number.isNaN(month)) {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  }
  return { year, month };
}

/** Desplaza año/mes por un delta de meses (FC163 F2B4 Sub-Batch 4B-2). */
export function shiftMonth(year: number, month: number, delta: number): YearMonth {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** Clases Tailwind de una celda de día según su estado (seleccionado/rango/hoy) (FC163 F2B4 Sub-Batch 4B-2). */
export function getDayCls(
  dateStr: string,
  selected: string,
  rangeFrom: string,
  rangeTo: string,
  today: string
): string {
  const isSelected = dateStr === selected;
  const isFrom = dateStr === rangeFrom;
  const isTo = dateStr === rangeTo;
  const isInRange =
    Boolean(rangeFrom) && Boolean(rangeTo) && dateStr > rangeFrom && dateStr < rangeTo;
  const isToday = dateStr === today && !isSelected && !isFrom && !isTo;

  if (isSelected || isFrom || isTo) {
    return 'bg-pinnacle-navy text-white rounded-[4px] font-black scale-105 shadow-sm';
  }
  if (isInRange) {
    return 'bg-pinnacle-navy/10 text-pinnacle-navy rounded-[4px]';
  }
  if (isToday) {
    return 'ring-1 ring-yellow-400 rounded-[4px] text-pinnacle-navy font-bold';
  }
  return 'bg-transparent text-pinnacle-navy/70 hover:bg-slate-100 rounded-[4px]';
}

/** Etiqueta del rango aplicado, o texto por defecto si aún no hay rango (FC163 F2B4 Sub-Batch 4B-2). */
export function computeAppliedLabel(value: DateRange): string {
  return value.from && value.to
    ? `${formatLabel(value.from)} — ${formatLabel(value.to)}`
    : 'Selecciona un rango';
}

/** Valida que el rango de borrador tenga ambas fechas y en el orden correcto (FC163 F2B4 Sub-Batch 4B-2). */
export function validateDraftRange(draftFrom: string, draftTo: string): string | null {
  if (!draftFrom || !draftTo) return 'Selecciona una fecha de inicio y fin.';
  if (draftFrom > draftTo) return 'La fecha de inicio debe ser anterior o igual a la fecha de fin.';
  return null;
}

/** Formatea un monto como moneda MXN sin decimales. */
export function formatMXN(value: number): string {
  return value.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  });
}

/** Formatea un período 'YYYY-MM' como 'mes de YYYY' en es-MX. */
export function periodLabel(period: string): string {
  const [y, m] = period.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
}

export const CHART_WINDOWS: { label: string; months: number | null }[] = [
  { label: '15D', months: 1 },
  { label: '1M', months: 1 },
  { label: '2M', months: 2 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '12M', months: 12 },
  { label: 'Todo', months: null },
];

export const MIN_VISUAL_PCT = 2;

import { FinancialTransaction } from '../../../types/finance';

/** Formatea un monto como moneda MXN (FC163 F1B-3, split Alfa 219_AN). */
export function formatMXN(value: number | string): string {
  return Number(value).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  });
}

/** Formatea una fecha ISO al formato corto es-MX (FC163 F1B-3, split Alfa 219_AN). */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Limpia el concepto de una transacción (quita ruido de backfill/UUIDs en filas AUTO) (FC163 F1B-3, split Alfa 219_AN). */
export function cleanConcept(row: FinancialTransaction): string {
  if (row.source !== 'AUTO') {
    if (row.vendor) return row.vendor;
    if (row.notes) return row.notes;
    return '—';
  }
  if (!row.notes) return '—';
  return row.notes
    .replace(/\s*\(backfill\)/gi, '')
    .replace(/:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/:\s*[0-9a-f]{32,}/gi, '')
    .trim();
}

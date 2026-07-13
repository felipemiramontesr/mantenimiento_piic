/**
 * 🔱 Archon Utils: exportUtils (FC 041 Fase E)
 * Exportación segura del lado cliente — CSV puro sin peticiones de red.
 *
 * POLÍTICA PII DE ARCHIVO (§8.1 · cond.1 Bravo, FC 041 v1.2): los campos
 * {placas, numeroSerie, circulationCardNumber} (y sus variantes snake_case)
 * se enmascaran SIEMPRE en cualquier archivo generado — aunque el usuario
 * tenga permiso de descifrado en pantalla. Un archivo se reenvía y persiste
 * fuera del control de acceso; la UI no.
 */

export const PII_MASK = '•••';

/** Dominio finito §8.1 — enumerado, sin claves implícitas (Regla 22). */
const PII_KEYS = new Set([
  'placas',
  'numeroSerie',
  'numero_serie',
  'circulationCardNumber',
  'circulation_card_number',
]);

export interface CsvColumn {
  key: string;
  label: string;
}

/** T1 — RemoteExportEnabled: habilitado ⟺ ¬RequiereBackend ∨ Online. */
export function isRemoteExportAllowed(requiresBackend: boolean, online: boolean): boolean {
  return !requiresBackend || online;
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function cellValue(row: Record<string, unknown>, column: CsvColumn): string {
  if (PII_KEYS.has(column.key)) return PII_MASK; // política de archivo: sin excepciones
  const raw = row[column.key];
  if (raw === null || raw === undefined) return '';
  return escapeCsvCell(String(raw));
}

/** CSV RFC 4180 (CRLF) — solo columnas visibles, cero peticiones de red. */
export function buildCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => cellValue(row, c)).join(','));
  return [header, ...lines].join('\r\n');
}

/* v8 ignore start -- helper DOM puro de descarga; sin lógica ramificada propia */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
/* v8 ignore stop */

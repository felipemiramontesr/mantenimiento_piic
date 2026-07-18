import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { ArchonTableSkeleton } from '../ArchonSkeleton';
import SovereignScrollArea from './SovereignScrollArea';

export interface ArchonTableHeader {
  key: string;
  label: string | React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  width?: string;
}

/**
 * FC 078 F1 (Cond.1 Bravo) — ancho mínimo por columna cuando el consumidor
 * no declara `width`: garantiza que la tabla exceda su contenedor y el
 * scroll actúe, en vez del colapso table-fixed que encimaba encabezados
 * (078_AN §1: 8-10 columnas aplastadas a ~35px con whitespace-nowrap).
 * 96px = mínimo legible para un header uppercase tracking-[0.15em] corto.
 */
export const MIN_COL_PX = 96;

/**
 * FC 078 F1 — minWidth REAL de la tabla: override explícito > suma de
 * widths declarados (px) > headers × MIN_COL_PX. Si algún width declarado
 * no es px-parseable (%, auto), se cae al derivado por conteo — jamás NaN.
 */
export function deriveMinTableWidth(headers: ArchonTableHeader[], minTableWidth?: number): number {
  if (minTableWidth !== undefined) return minTableWidth;
  // Solo anchos en px explícitos ("120px") cuentan para la suma; %, auto,
  // rem u otras unidades caen al derivado por conteo (parseFloat('10%')=10
  // sería un falso positivo — de ahí el regex estricto).
  const parsed = headers.map((h) =>
    h.width && /^\d+(\.\d+)?px$/.test(h.width.trim()) ? Number.parseFloat(h.width) : NaN
  );
  const allPx = headers.length > 0 && parsed.every((n) => Number.isFinite(n) && n > 0);
  if (allPx) return parsed.reduce((a, b) => a + b, 0);
  return headers.length * MIN_COL_PX;
}

interface ArchonDataTableProps<T> {
  data: T[];
  headers: ArchonTableHeader[];
  renderRow: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  testId?: string;
  className?: string;
  onSort?: (key: string) => void;
  sortConfig?: {
    field: string | null;
    direction: 'asc' | 'desc';
  };
  variant?: 'master' | 'embedded';
  /** FC 078 — override explícito del ancho mínimo (px) de la tabla. */
  minTableWidth?: number;
}

/**
 * 🔱 ARCHON DATA TABLE (v.78.100.103)
 * Architecture: Sovereign Registry Engine
 * Principles: ZERO-NOISE, INDUSTRIAL AXIAL ALIGNMENT.
 * Refactor: Persistent Sorting UX Telemetry (Lucide Integration).
 */
export function ArchonDataTable<T>({
  data,
  headers,
  renderRow,
  loading = false,
  loadingMessage = 'Sincronizando Registros...',
  emptyMessage = 'No hay registros disponibles-',
  testId = 'archon-data-table',
  className = '',
  onSort,
  sortConfig,
  variant = 'master',
  minTableWidth,
}: ArchonDataTableProps<T>): React.JSX.Element {
  if (loading) {
    const loadingClasses =
      variant === 'master'
        ? `bg-white p-6 space-y-6 w-full ${className}`
        : `w-full p-0 space-y-4 ${className}`;

    return (
      <div className={loadingClasses}>
        <div className="flex items-center gap-3 opacity-40 animate-pulse">
          <div className="w-4 h-4 bg-pinnacle-yellow rounded-[4px]" />
          <span className="text-archon-md font-black text-pinnacle-navy uppercase tracking-[0.2em]">
            {loadingMessage}
          </span>
        </div>
        <ArchonTableSkeleton rows={6} />
      </div>
    );
  }

  const getJustifyClass = (align?: string): string => {
    if (align === 'left') return 'justify-start';
    if (align === 'right') return 'justify-end';
    return 'justify-center';
  };

  const getAlignClass = (align?: string): string => {
    if (align === 'left') return 'text-left';
    if (align === 'right') return 'text-right';
    return 'text-center';
  };

  // FC 078 F1 — el contenedor de scroll ahora es SovereignScrollArea
  // (affordance de gradientes incluida); estas clases visten su viewport.
  const containerClasses =
    variant === 'master'
      ? `bg-white border-y border-pinnacle-navy/5 animate-in fade-in duration-700 w-full ${className}`
      : `w-full !p-0 !m-0 !rounded-none !border-none ${className}`;

  // FC 078 F1 — minWidth real: la tabla declara su ancho y el scroll actúa;
  // table-fixed SOLO cuando el consumidor declaró anchos por columna (si no,
  // table-auto deja que el contenido respire sobre el mínimo garantizado).
  const resolvedMinWidth = deriveMinTableWidth(headers, minTableWidth);
  const hasExplicitWidths = headers.some((h) => h.width);

  return (
    <SovereignScrollArea className={containerClasses} testId={`${testId}-scroll`}>
      <table
        data-testid={testId}
        style={{ borderLeft: 'none', borderRight: 'none', minWidth: `${resolvedMinWidth}px` }}
        className={`w-full border-collapse ${
          hasExplicitWidths ? 'table-fixed' : 'table-auto'
        } [&_td]:!border-x-0 [&_th]:!border-x-0 [&_tr]:!border-x-0`}
      >
        <thead className="sticky top-0 z-20">
          <tr className="border-b border-pinnacle-navy/10 shadow-md">
            {headers.map((header) => (
              <th
                key={header.key}
                onClick={(): void => {
                  if (header.sortable && onSort) {
                    onSort(header.key);
                  }
                }}
                style={header.width ? { width: header.width } : {}}
                className={`
                  bg-pinnacle-navy h-14 px-3 text-white text-archon-base font-black uppercase tracking-[0.15em] whitespace-nowrap
                  ${
                    header.sortable
                      ? 'cursor-pointer hover:bg-pinnacle-navy/90 transition-colors'
                      : ''
                  } 
                  ${getAlignClass(header.align)}
                `}
              >
                <div className={`flex items-center gap-2 ${getJustifyClass(header.align)}`}>
                  {header.label}
                  {header.sortable && (
                    <span className="inline-flex ml-1">
                      {sortConfig?.field === header.key ? (
                        <>
                          {sortConfig.direction === 'desc' ? (
                            <ChevronDown size={14} className="text-pinnacle-yellow" />
                          ) : (
                            <ChevronUp size={14} className="text-pinnacle-yellow" />
                          )}
                        </>
                      ) : (
                        <ChevronsUpDown size={14} className="text-white/20" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white [&>tr>td]:border-t [&>tr>td]:border-slate-200">
          {data.length > 0 ? (
            data.map((item, index) => renderRow(item, index))
          ) : (
            <tr>
              <td colSpan={headers.length} className="py-20 text-center">
                <p className="text-archon-xl font-black text-pinnacle-navy opacity-20 uppercase tracking-widest">
                  {emptyMessage}
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </SovereignScrollArea>
  );
}

export default ArchonDataTable;

import React from 'react';
import { ArchonTableSkeleton } from '../ArchonSkeleton';

export interface ArchonTableHeader {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
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
}

/**
 * 🔱 ARCHON DATA TABLE (v.78.100.102)
 * Architecture: Sovereign Registry Engine
 * Principles: ZERO-NOISE, INDUSTRIAL AXIAL ALIGNMENT.
 * Refactor: 100% Pure Tailwind (Purged Hexes & Shadows).
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
          <span className="text-[11px] font-black text-pinnacle-navy uppercase tracking-[0.2em]">
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

  const containerClasses =
    variant === 'master'
      ? `bg-white overflow-hidden border border-pinnacle-navy/5 rounded-[4px] custom-scrollbar animate-in fade-in duration-700 relative w-full ${className}`
      : `w-full !p-0 !m-0 !rounded-none !border-none overflow-x-auto custom-scrollbar relative ${className}`;

  return (
    <div className={containerClasses}>
      <table data-testid={testId} className="w-full border-collapse">
        <thead>
          <tr className="bg-pinnacle-navy border-b border-pinnacle-navy/10">
            {headers.map((header) => (
              <th
                key={header.key}
                onClick={(): void => {
                  if (header.sortable && onSort) {
                    onSort(header.key);
                  }
                }}
                className={`
                  h-14 px-6 text-white text-[10px] font-black uppercase tracking-[0.15em]
                  ${header.sortable ? 'cursor-pointer hover:bg-pinnacle-navy/90' : ''} 
                  text-${header.align || 'center'}
                `}
              >
                <div className={`flex items-center gap-2 ${getJustifyClass(header.align)}`}>
                  {header.label}
                  {header.sortable && sortConfig?.field === header.key && (
                    <span className="inline-flex ml-1 text-pinnacle-yellow">
                      {sortConfig.direction === 'desc' ? '▼' : '▲'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.length > 0 ? (
            data.map((item, index) => renderRow(item, index))
          ) : (
            <tr>
              <td colSpan={headers.length} className="py-20 text-center">
                <p className="text-[14px] font-black text-pinnacle-navy opacity-20 uppercase tracking-widest">
                  {emptyMessage}
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ArchonDataTable;

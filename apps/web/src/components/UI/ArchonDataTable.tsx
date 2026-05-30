import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { ArchonTableSkeleton } from '../ArchonSkeleton';

export interface ArchonTableHeader {
  key: string;
  label: string | React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  width?: string;
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

  const getAlignClass = (align?: string): string => {
    if (align === 'left') return 'text-left';
    if (align === 'right') return 'text-right';
    return 'text-center';
  };

  const containerClasses =
    variant === 'master'
      ? `bg-white overflow-x-auto custom-scrollbar border-y border-pinnacle-navy/5 animate-in fade-in duration-700 relative w-full ${className}`
      : `w-full !p-0 !m-0 !rounded-none !border-none overflow-x-auto custom-scrollbar relative ${className}`;

  return (
    <div className={containerClasses} style={{ borderLeft: 'none', borderRight: 'none' }}>
      <table
        data-testid={testId}
        style={{ borderLeft: 'none', borderRight: 'none' }}
        className="w-full border-collapse table-fixed [&_td]:!border-x-0 [&_th]:!border-x-0 [&_tr]:!border-x-0"
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
                  bg-pinnacle-navy h-14 px-3 text-white text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap
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

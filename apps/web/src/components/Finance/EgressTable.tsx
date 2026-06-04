import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Download, Plus, ChevronDown, Search, X } from 'lucide-react';
import api from '../../api/client';
import { FinancialTransaction, FinanceCategory, CATEGORY_LABELS } from '../../types/finance';
import EgressRegistrationModal from './EgressRegistrationModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMXN(value: number | string): string {
  return Number(value).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function cleanConcept(row: FinancialTransaction): string {
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

const CATEGORY_BADGE: Record<FinanceCategory, string> = {
  LEASE: 'bg-pinnacle-navy/10 text-pinnacle-navy',
  INSURANCE: 'bg-sky-100 text-sky-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
  FUEL: 'bg-emerald-100 text-emerald-700',
  TIRE: 'bg-violet-100 text-violet-700',
  FINE: 'bg-red-100 text-red-700',
  REPAIR: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-slate-100 text-slate-600',
};

const ALL_CATEGORIES: FinanceCategory[] = [
  'LEASE',
  'INSURANCE',
  'MAINTENANCE',
  'FUEL',
  'TIRE',
  'FINE',
  'REPAIR',
  'OTHER',
];

// ─── Component ────────────────────────────────────────────────────────────────

interface EgressTableProps {
  from: string;
  to: string;
  initialCategory?: FinanceCategory | '';
}

const EgressTable: React.FC<EgressTableProps> = ({
  from,
  to,
  initialCategory = '',
}): React.ReactElement => {
  const [rows, setRows] = useState<FinancialTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<FinanceCategory | ''>(initialCategory);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const buildUrl = useCallback(
    (cursor?: string): string => {
      const params = new URLSearchParams({ from, to, limit: '50' });
      if (categoryFilter) params.set('category', categoryFilter);
      if (unitFilter) params.set('unitId', unitFilter);
      if (cursor) params.set('cursor', cursor);
      return `/finance/transactions?${params.toString()}`;
    },
    [from, to, categoryFilter, unitFilter]
  );

  // Sugerencias: unit_names únicos de los rows cargados que coincidan con la búsqueda
  const suggestions = useMemo((): string[] => {
    if (!unitSearch.trim()) return [];
    const term = unitSearch.trim().toUpperCase();
    const seen = new Set<string>();
    return rows
      .map((r) => String(r.unit_name).toUpperCase())
      .filter((name) => {
        if (seen.has(name)) return false;
        seen.add(name);
        return name.includes(term);
      })
      .slice(0, 8);
  }, [rows, unitSearch]);

  // Click-outside cierra el dropdown
  useEffect((): (() => void) => {
    const handler = (e: MouseEvent): void => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return (): void => {
      document.removeEventListener('mousedown', handler);
    };
  }, []);

  const selectUnit = (unit: string): void => {
    setUnitFilter(unit);
    setUnitSearch(unit);
    setSearchOpen(false);
  };

  const clearUnit = (): void => {
    setUnitFilter('');
    setUnitSearch('');
    setSearchOpen(false);
  };

  const fetchRows = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        data: FinancialTransaction[];
        meta: { nextCursor: string | null; total: number };
      }>(buildUrl());
      setRows(res.data.data);
      setNextCursor(res.data.meta.nextCursor);
      setTotal(res.data.meta.total);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect((): void => {
    fetchRows();
  }, [fetchRows]);

  const loadMore = async (): Promise<void> => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await api.get<{
        success: boolean;
        data: FinancialTransaction[];
        meta: { nextCursor: string | null; total: number };
      }>(buildUrl(nextCursor));
      setRows((prev) => [...prev, ...res.data.data]);
      setNextCursor(res.data.meta.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await api.get(`/finance/export?${params.toString()}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `egresos_${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleTransactionCreated = (): void => {
    setShowModal(false);
    fetchRows();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Toolbar */}
      <div className="grid grid-cols-2 gap-10">
        {/* IZQUIERDA — filtros apilados (col-alfa = mismo ancho que search de header) */}
        <div className="flex flex-col gap-2">
          {/* Autocomplete de unidad */}
          <div ref={searchRef} className="relative w-full group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search
                size={13}
                className="text-slate-400 group-focus-within:text-[#0f2a44] transition-colors duration-300"
              />
            </span>
            <input
              type="text"
              value={unitSearch}
              placeholder="Buscar unidad..."
              onChange={(e): void => {
                setUnitSearch(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={(): void => setSearchOpen(true)}
              onKeyDown={(e): void => {
                if (e.key === 'Escape') setSearchOpen(false);
              }}
              style={{ border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px' }}
              className="w-full pl-9 pr-9 py-3 text-archon-md font-bold text-[#0f2a44] bg-white focus:outline-none placeholder-slate-400/80 tracking-[0.02em] shadow-sm shadow-slate-100/50"
            />
            {unitSearch && (
              <button
                onClick={clearUnit}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sentinel-red border-none bg-transparent cursor-pointer transition-colors duration-200 active:scale-95"
              >
                <X size={13} />
              </button>
            )}
            {searchOpen && suggestions.length > 0 && (
              <ul
                style={{ border: '1px solid rgba(15, 42, 68, 0.2)', borderRadius: '4px' }}
                className="absolute left-0 right-0 top-full mt-1.5 bg-white shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-200"
              >
                {suggestions.map((unit) => (
                  <li
                    key={unit}
                    onClick={(): void => selectUnit(unit)}
                    className="px-4 py-2.5 text-archon-md font-bold text-pinnacle-navy hover:bg-slate-50 cursor-pointer flex items-center justify-between uppercase tracking-tight transition-colors duration-150"
                  >
                    <span>{unit}</span>
                    <span className="text-archon-sm font-black text-slate-400 tracking-wider">
                      SELECCIONAR
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Filtro de categoría */}
          <div className="relative w-full">
            <select
              value={categoryFilter}
              onChange={(e): void => setCategoryFilter(e.target.value as FinanceCategory | '')}
              style={{ border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px' }}
              className="appearance-none w-full pl-4 pr-8 py-3 text-archon-md font-bold text-[#0f2a44] bg-white focus:outline-none cursor-pointer shadow-sm shadow-slate-100/50 tracking-[0.02em]"
            >
              <option value="">Todas las categorías</option>
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
        {/* fin filtros apilados */}

        {/* DERECHA — contador + acciones (col-beta, alineados a la derecha) */}
        <div className="flex items-center justify-end gap-3">
          <span className="text-archon-base font-bold text-pinnacle-navy/40 uppercase tracking-widest">
            {total} registro{total !== 1 ? 's' : ''}
          </span>

          <button
            onClick={handleExport}
            disabled={exporting}
            title="Exportar CSV"
            className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
          >
            <Download size={18} className="transition-transform duration-300" />
          </button>

          <button
            onClick={(): void => setShowModal(true)}
            title="Registrar egreso"
            className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
          >
            <Plus size={18} className="transition-transform duration-300" />
          </button>
        </div>
        {/* fin acciones */}
      </div>

      {/* Table */}
      <div className="bg-white border border-pinnacle-navy/5 rounded-[4px] shadow-pinnacle overflow-x-auto">
        <table className="w-full [&_td]:!border-x-0 [&_th]:!border-x-0">
          <thead>
            <tr className="bg-pinnacle-navy">
              <th className="text-center py-4 px-4 text-archon-base font-black uppercase tracking-[0.15em] text-white/70 whitespace-nowrap">
                Unidad
              </th>
              <th className="text-center py-4 px-4 text-archon-base font-black uppercase tracking-[0.15em] text-white/70 whitespace-nowrap">
                Categoría
              </th>
              <th className="text-center py-4 px-4 text-archon-base font-black uppercase tracking-[0.15em] text-white/70 whitespace-nowrap">
                Monto
              </th>
              <th className="text-center py-4 px-4 text-archon-base font-black uppercase tracking-[0.15em] text-white/70 whitespace-nowrap">
                Concepto
              </th>
              <th className="text-center py-4 px-4 text-archon-base font-black uppercase tracking-[0.15em] text-white/70 whitespace-nowrap">
                Origen
              </th>
              <th className="text-center py-4 px-4 text-archon-base font-black uppercase tracking-[0.15em] text-white/70 whitespace-nowrap">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-pinnacle-navy/20 border-t-pinnacle-navy rounded-full animate-spin" />
                    <span className="text-archon-md text-pinnacle-navy/40 font-bold uppercase tracking-widest">
                      Cargando...
                    </span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-16 text-center text-archon-md font-bold text-pinnacle-navy/30 uppercase tracking-widest"
                >
                  Sin egresos registrados en este período
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr
                  key={row.uuid}
                  className="border-y border-slate-200/50 bg-transparent hover:bg-slate-50/50 transition-all duration-300"
                >
                  <td className="text-center py-4 px-4 font-mono font-black text-archon-label text-pinnacle-navy whitespace-nowrap">
                    {row.unit_name}
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="flex justify-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-[4px] text-archon-sm font-black uppercase tracking-widest ${
                          CATEGORY_BADGE[row.category] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4 font-mono font-black text-archon-lg text-pinnacle-navy whitespace-nowrap">
                    {formatMXN(row.amount)}
                  </td>
                  <td className="text-center py-4 px-4">
                    {row.source === 'AUTO' ? (
                      <span className="text-archon-md text-pinnacle-navy/60 italic">
                        {cleanConcept(row)}
                      </span>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-archon-md font-bold text-pinnacle-navy">
                          {cleanConcept(row)}
                        </span>
                        {row.invoice_ref && (
                          <span className="text-archon-sm font-mono text-pinnacle-navy/40">
                            {row.invoice_ref}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="flex justify-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-[4px] text-archon-sm font-black uppercase tracking-widest ${
                          row.source === 'AUTO'
                            ? 'bg-sky-50 text-sky-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {row.source === 'AUTO' ? 'Sistema' : 'Manual'}
                      </span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4 text-archon-md font-bold text-pinnacle-navy/60 whitespace-nowrap">
                    {formatDate(row.created_at)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Load more */}
      {nextCursor && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-archon-base font-black uppercase tracking-widest text-pinnacle-navy/50 hover:text-pinnacle-navy transition-colors duration-300 flex items-center gap-2"
          >
            {loadingMore ? 'Cargando...' : 'Cargar más'}
            <ChevronDown size={12} />
          </button>
        </div>
      )}

      {showModal && (
        <EgressRegistrationModal
          onClose={(): void => setShowModal(false)}
          onSuccess={handleTransactionCreated}
        />
      )}
    </div>
  );
};

export default EgressTable;

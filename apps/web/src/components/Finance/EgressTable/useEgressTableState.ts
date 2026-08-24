import { useState, useEffect, useCallback, useRef, useMemo, type RefObject } from 'react';
import api from '../../../api/client';
import { FinancialTransaction, FinanceCategory } from '../../../types/finance';

interface TransactionsPage {
  success: boolean;
  data: FinancialTransaction[];
  meta: { nextCursor: string | null; total: number };
}

/** Cierra el dropdown de sugerencias al hacer click fuera (FC163 F1B-3, split Alfa 219_AN — sub-split de useEgressTableState). */
function useCloseOnOutsideClick(
  searchRef: RefObject<HTMLDivElement>,
  setSearchOpen: (open: boolean) => void
): void {
  useEffect((): (() => void) => {
    const handler = (e: MouseEvent): void => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return (): void => document.removeEventListener('mousedown', handler);
  }, [searchRef, setSearchOpen]);
}

interface UseEgressFiltersResult {
  categoryFilter: FinanceCategory | '';
  setCategoryFilter: (c: FinanceCategory | '') => void;
  unitFilter: string;
  unitSearch: string;
  onUnitSearchChange: (v: string) => void;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  searchRef: RefObject<HTMLDivElement>;
  selectUnit: (unit: string) => void;
  clearUnit: () => void;
}

/** Estado de filtros (categoría + búsqueda de unidad) (FC163 F1B-3, split Alfa 219_AN — sub-split de useEgressTableState). */
function useEgressFilters(initialCategory: FinanceCategory | ''): UseEgressFiltersResult {
  const [categoryFilter, setCategoryFilter] = useState<FinanceCategory | ''>(initialCategory);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  useCloseOnOutsideClick(searchRef, setSearchOpen);

  const onUnitSearchChange = (v: string): void => {
    setUnitSearch(v);
    setSearchOpen(true);
  };
  const openSearch = (): void => setSearchOpen(true);
  const closeSearch = (): void => setSearchOpen(false);

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

  return {
    categoryFilter,
    setCategoryFilter,
    unitFilter,
    unitSearch,
    onUnitSearchChange,
    searchOpen,
    openSearch,
    closeSearch,
    searchRef,
    selectUnit,
    clearUnit,
  };
}

interface UseEgressFetchResult {
  rows: FinancialTransaction[];
  total: number;
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  fetchRows: () => Promise<void>;
  loadMore: () => Promise<void>;
}

/** Carga/paginado de transacciones (FC163 F1B-3, split Alfa 219_AN — sub-split de useEgressTableState). */
function useEgressFetch(buildUrl: (cursor?: string) => string): UseEgressFetchResult {
  const [rows, setRows] = useState<FinancialTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchRows = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.get<TransactionsPage>(buildUrl());
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
      const res = await api.get<TransactionsPage>(buildUrl(nextCursor));
      setRows((prev) => [...prev, ...res.data.data]);
      setNextCursor(res.data.meta.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  return { rows, total, nextCursor, loading, loadingMore, fetchRows, loadMore };
}

/** Exportación CSV del período/categoría actual (FC163 F1B-3, split Alfa 219_AN — sub-split de useEgressTableState). */
function useEgressExport(
  from: string,
  to: string,
  categoryFilter: FinanceCategory | ''
): { exporting: boolean; handleExport: () => Promise<void> } {
  const [exporting, setExporting] = useState(false);

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

  return { exporting, handleExport };
}

/** Sugerencias de unidad (nombres únicos de las filas cargadas que coinciden con la búsqueda) (FC163 F1B-3, split Alfa 219_AN — sub-split de useEgressTableState). */
function useUnitSuggestions(rows: FinancialTransaction[], unitSearch: string): string[] {
  return useMemo((): string[] => {
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
}

export interface UseEgressTableStateResult {
  rows: FinancialTransaction[];
  total: number;
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  categoryFilter: FinanceCategory | '';
  setCategoryFilter: (c: FinanceCategory | '') => void;
  unitSearch: string;
  onUnitSearchChange: (v: string) => void;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  showModal: boolean;
  openModal: () => void;
  closeModal: () => void;
  exporting: boolean;
  searchRef: RefObject<HTMLDivElement>;
  suggestions: string[];
  selectUnit: (unit: string) => void;
  clearUnit: () => void;
  loadMore: () => Promise<void>;
  handleExport: () => Promise<void>;
  handleTransactionCreated: () => void;
}

/** Estado + acciones de la tabla de egresos (fetch, filtros, exportación, paginado) (FC163 F1B-3, split Alfa 219_AN). */
export function useEgressTableState(
  from: string,
  to: string,
  initialCategory: FinanceCategory | ''
): UseEgressTableStateResult {
  const filters = useEgressFilters(initialCategory);
  const [showModal, setShowModal] = useState(false);

  const buildUrl = useCallback(
    (cursor?: string): string => {
      const params = new URLSearchParams({ from, to, limit: '50' });
      if (filters.categoryFilter) params.set('category', filters.categoryFilter);
      if (filters.unitFilter) params.set('unitId', filters.unitFilter);
      if (cursor) params.set('cursor', cursor);
      return `/finance/transactions?${params.toString()}`;
    },
    [from, to, filters.categoryFilter, filters.unitFilter]
  );

  const fetchState = useEgressFetch(buildUrl);
  const { exporting, handleExport } = useEgressExport(from, to, filters.categoryFilter);
  const suggestions = useUnitSuggestions(fetchState.rows, filters.unitSearch);

  const handleTransactionCreated = (): void => {
    setShowModal(false);
    fetchState.fetchRows();
  };

  return {
    ...fetchState,
    ...filters,
    showModal,
    openModal: (): void => setShowModal(true),
    closeModal: (): void => setShowModal(false),
    exporting,
    suggestions,
    handleExport,
    handleTransactionCreated,
  };
}

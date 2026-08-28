import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import api from '../../../api/client';
import { AuditRow, AuditMeta, Filters, EMPTY_FILTERS } from './types';

export interface AuditLogDataState {
  rows: AuditRow[];
  meta: AuditMeta;
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  loading: boolean;
  error: boolean;
  handleApply: () => void;
  totalPages: number;
}

function buildAuditLogParams(currentPage: number, currentFilters: Filters): URLSearchParams {
  const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
  if (currentFilters.entity_type) params.set('entity_type', currentFilters.entity_type);
  if (currentFilters.action) params.set('action', currentFilters.action);
  if (currentFilters.date_from) params.set('date_from', currentFilters.date_from);
  if (currentFilters.date_to) params.set('date_to', currentFilters.date_to);
  return params;
}

/** Fetch, filtros y paginación del historial de auditoría (FC163 F2B4 Sub-Batch 4B-2). */
export function useAuditLogData(): AuditLogDataState {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [meta, setMeta] = useState<AuditMeta>({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(
    async (currentPage: number, currentFilters: Filters): Promise<void> => {
      setLoading(true);
      setError(false);
      try {
        const params = buildAuditLogParams(currentPage, currentFilters);
        const res = await api.get(`/security/audit-log?${params.toString()}`);
        setRows(res.data.data);
        setMeta(res.data.meta);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect((): void => {
    fetchData(page, applied);
  }, [fetchData, page, applied]);

  const handleApply = (): void => {
    setPage(1);
    setApplied({ ...filters });
  };

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  return {
    rows,
    meta,
    filters,
    setFilters,
    page,
    setPage,
    loading,
    error,
    handleApply,
    totalPages,
  };
}

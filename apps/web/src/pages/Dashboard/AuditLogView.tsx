import React, { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import api from '../../api/client';
import usePermissions from '../../hooks/usePermissions';
import ArchonDataTable, { ArchonTableHeader } from '../../components/UI/ArchonDataTable';

interface AuditRow {
  uuid: string;
  entity_type: string;
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  reason: string;
  snapshot_before: Record<string, unknown> | null;
  snapshot_after: Record<string, unknown> | null;
  created_at: string;
  owner_id: number | null;
  actor_username: string | null;
  actor_full_name: string | null;
  universe_label: string | null;
}

interface AuditMeta {
  page: number;
  limit: number;
  total: number;
}

interface Filters {
  entity_type: string;
  action: string;
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: Filters = { entity_type: '', action: '', date_from: '', date_to: '' };

const ACTION_BADGE: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 border border-green-200',
  UPDATE: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  DELETE: 'bg-red-100 text-red-700 border border-red-200',
};

const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Modificación',
  DELETE: 'Eliminación',
};

const ENTITY_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'user', label: 'Usuario' },
  { value: 'fleet_unit', label: 'Vehículo' },
  { value: 'route_log', label: 'Ruta' },
  { value: 'catalog', label: 'Catálogo' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'CREATE', label: 'Creación' },
  { value: 'UPDATE', label: 'Modificación' },
  { value: 'DELETE', label: 'Eliminación' },
];

const LABEL_CLS =
  'text-archon-base font-black uppercase tracking-[0.15em] text-[#0f2a44]/50 mb-1 block';

function SnapshotDiff({
  before,
  after,
  onlyDiffs,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  onlyDiffs: boolean;
}): React.ReactElement {
  const allKeys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));

  const visibleKeys = onlyDiffs
    ? allKeys.filter((k) => JSON.stringify((before ?? {})[k]) !== JSON.stringify((after ?? {})[k]))
    : allKeys;

  if (visibleKeys.length === 0) {
    return (
      <p className="text-xs text-pinnacle-navy/40 italic">
        {onlyDiffs ? 'Sin diferencias detectadas.' : 'Sin datos de snapshot.'}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
      <div className="text-pinnacle-navy/40 font-black uppercase tracking-widest text-[10px] col-span-2 grid grid-cols-2">
        <span>Antes</span>
        <span>Después</span>
      </div>
      {visibleKeys.map((key) => {
        const bVal = JSON.stringify((before ?? {})[key] ?? null);
        const aVal = JSON.stringify((after ?? {})[key] ?? null);
        const changed = bVal !== aVal;
        return (
          <React.Fragment key={key}>
            <div
              className={`rounded-[2px] px-2 py-1 ${
                changed ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-pinnacle-navy/60'
              }`}
            >
              <span className="opacity-50">{key}: </span>
              {bVal}
            </div>
            <div
              className={`rounded-[2px] px-2 py-1 ${
                changed ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-pinnacle-navy/60'
              }`}
            >
              <span className="opacity-50">{key}: </span>
              {aVal}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

const AuditLogView: React.FC = (): React.ReactElement => {
  const { isOmnipotent } = usePermissions();
  const omnipotent = isOmnipotent();

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [meta, setMeta] = useState<AuditMeta>({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [onlyDiffs, setOnlyDiffs] = useState(false);

  const fetchData = useCallback(
    async (currentPage: number, currentFilters: Filters): Promise<void> => {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
        if (currentFilters.entity_type) params.set('entity_type', currentFilters.entity_type);
        if (currentFilters.action) params.set('action', currentFilters.action);
        if (currentFilters.date_from) params.set('date_from', currentFilters.date_from);
        if (currentFilters.date_to) params.set('date_to', currentFilters.date_to);

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

  if (loading) {
    return (
      <div data-testid="audit-log-loading" className="space-y-2 animate-pulse p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-slate-100 rounded-[4px]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="audit-log-error"
        className="rounded-[4px] px-4 py-6 text-center bg-red-50 border border-red-200 text-red-700 text-sm font-bold"
      >
        Error al cargar el historial de auditoría. Intente de nuevo.
      </div>
    );
  }

  return (
    <div data-testid="audit-log-view" className="space-y-4">
      {/* ── FILTROS ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 items-end">
        <div>
          <label className={LABEL_CLS}>Tipo de Entidad</label>
          <select
            className="archon-input"
            value={filters.entity_type}
            onChange={(e): void => setFilters((f) => ({ ...f, entity_type: e.target.value }))}
            data-testid="filter-entity-type"
          >
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL_CLS}>Acción</label>
          <select
            className="archon-input"
            value={filters.action}
            onChange={(e): void => setFilters((f) => ({ ...f, action: e.target.value }))}
            data-testid="filter-action"
          >
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL_CLS}>Desde</label>
          <input
            type="date"
            className="archon-input"
            value={filters.date_from}
            onChange={(e): void => setFilters((f) => ({ ...f, date_from: e.target.value }))}
            data-testid="filter-date-from"
          />
        </div>

        <div>
          <label className={LABEL_CLS}>Hasta</label>
          <input
            type="date"
            className="archon-input"
            value={filters.date_to}
            onChange={(e): void => setFilters((f) => ({ ...f, date_to: e.target.value }))}
            data-testid="filter-date-to"
          />
        </div>

        <button
          onClick={handleApply}
          className="col-span-2 lg:col-span-4 w-full h-11 flex items-center justify-center rounded-[4px] bg-pinnacle-navy text-pinnacle-yellow text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer"
          data-testid="filter-apply"
        >
          Aplicar Filtros
        </button>
      </div>

      {/* ── TABLA ── */}
      {rows.length === 0 ? (
        <div
          data-testid="audit-log-empty"
          className="rounded-[4px] px-6 py-12 text-center bg-slate-50 border border-slate-200"
        >
          <p className="text-sm font-black uppercase tracking-widest text-pinnacle-navy/60 mb-1">
            Sin registros de auditoría
          </p>
          <p className="text-xs text-pinnacle-navy/40">
            No se encontraron eventos para los filtros seleccionados.
          </p>
        </div>
      ) : (
        <>
          {/* FC 078 F3 — tabla migrada a la primitiva ArchonDataTable (SSOT
              responsive). Misma data, mismo orden; la fila expandible viaja
              como Fragment (tr principal + tr de diff) desde renderRow. */}
          <div className="rounded-[4px] border border-slate-200 overflow-hidden">
            <ArchonDataTable<AuditRow>
              data={rows}
              headers={[
                { key: 'expand', label: '', align: 'left', width: '32px' },
                { key: 'fecha', label: 'Fecha', align: 'left' },
                ...(omnipotent
                  ? [
                      {
                        key: 'universo',
                        label: <span data-testid="col-universo">Universo</span>,
                        align: 'left',
                      } as ArchonTableHeader,
                    ]
                  : []),
                { key: 'actor', label: 'Actor', align: 'left' },
                { key: 'entidad', label: 'Entidad', align: 'left' },
                { key: 'accion', label: 'Acción', align: 'left' },
                { key: 'razon', label: 'Razón', align: 'left' },
              ]}
              testId="audit-log-table"
              variant="embedded"
              emptyMessage="Sin registros de auditoría"
              renderRow={(row): React.ReactNode => {
                const isExpanded = expandedRow === row.uuid;
                const date = new Date(row.created_at).toLocaleString('es-MX', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                });
                return (
                  <React.Fragment key={row.uuid}>
                    <tr
                      data-testid={`audit-row-${row.uuid}`}
                      onClick={(): void => setExpandedRow(isExpanded ? null : row.uuid)}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors text-xs text-pinnacle-navy"
                    >
                      <td className="px-3 py-2 text-pinnacle-navy/30">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-pinnacle-navy/60">{date}</td>
                      {omnipotent && (
                        <td className="px-3 py-2 text-pinnacle-navy/70">
                          {row.universe_label ?? '—'}
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <span className="font-bold">{row.actor_username ?? '—'}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-pinnacle-navy/50">{row.entity_type}/</span>
                        <span className="font-bold">{row.entity_id}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-[3px] font-black text-[10px] uppercase tracking-widest ${
                            ACTION_BADGE[row.action] ?? ''
                          }`}
                        >
                          {ACTION_LABEL[row.action] ?? row.action}
                        </span>
                      </td>
                      {/* P2-2 — celda truncable expone title (tooltip nativo) */}
                      <td
                        className="px-3 py-2 text-pinnacle-navy/60 max-w-[200px] truncate"
                        title={row.reason}
                      >
                        {row.reason}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr data-testid={`audit-diff-${row.uuid}`}>
                        <td
                          colSpan={omnipotent ? 7 : 6}
                          className="px-4 py-3 bg-slate-50 border-b border-slate-200"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-pinnacle-navy/40">
                              Diff de Cambios
                            </span>
                            <button
                              onClick={(e): void => {
                                e.stopPropagation();
                                setOnlyDiffs((v) => !v);
                              }}
                              className="text-[10px] font-black uppercase tracking-widest text-pinnacle-yellow underline"
                              data-testid="toggle-only-diffs"
                            >
                              {onlyDiffs ? 'Mostrar todo' : 'Solo diferencias'}
                            </button>
                          </div>
                          <SnapshotDiff
                            before={row.snapshot_before}
                            after={row.snapshot_after}
                            onlyDiffs={onlyDiffs}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }}
            />
          </div>

          {/* ── PAGINACIÓN ── */}
          <div className="flex items-center justify-between text-xs text-pinnacle-navy/50">
            <span className="font-bold uppercase tracking-widest">
              Página {meta.page} de {totalPages} · {meta.total} registros
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={(): void => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-[4px] border border-slate-200 font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-50 transition-colors"
                data-testid="pagination-prev"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={(): void => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-[4px] border border-slate-200 font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-50 transition-colors"
                data-testid="pagination-next"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditLogView;

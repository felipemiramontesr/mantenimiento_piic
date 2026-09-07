import React from 'react';
import { AuditMeta } from './types';

interface AuditPaginationProps {
  readonly meta: AuditMeta;
  readonly page: number;
  readonly setPage: React.Dispatch<React.SetStateAction<number>>;
  readonly totalPages: number;
}

/** Controles de paginación del historial de auditoría (FC163 F2B4 Sub-Batch 4B-2). */
function AuditPagination({
  meta,
  page,
  setPage,
  totalPages,
}: AuditPaginationProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between text-xs text-pinnacle-navy/50">
      <span className="font-bold uppercase tracking-widest">
        Página {meta.page} de {totalPages} · {meta.total} registros
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={(): void => setPage((p) => p - 1)}
          className="px-3 py-1.5 rounded-[4px] border border-slate-200 font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-50 transition-colors"
          data-testid="pagination-prev"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={(): void => setPage((p) => p + 1)}
          className="px-3 py-1.5 rounded-[4px] border border-slate-200 font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-50 transition-colors"
          data-testid="pagination-next"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

export default AuditPagination;

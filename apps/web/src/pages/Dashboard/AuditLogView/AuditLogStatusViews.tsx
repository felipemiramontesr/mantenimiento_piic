import React from 'react';

/** Skeleton de carga del historial de auditoría (FC163 F2B4 Sub-Batch 4B-2). */
export function AuditLogLoading(): React.ReactElement {
  return (
    <div data-testid="audit-log-loading" className="space-y-2 animate-pulse p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-10 bg-slate-100 rounded-[4px]" />
      ))}
    </div>
  );
}

/** Vista de error de carga del historial de auditoría (FC163 F2B4 Sub-Batch 4B-2). */
export function AuditLogError(): React.ReactElement {
  return (
    <div
      data-testid="audit-log-error"
      className="rounded-[4px] px-4 py-6 text-center bg-red-50 border border-red-200 text-red-700 text-sm font-bold"
    >
      Error al cargar el historial de auditoría. Intente de nuevo.
    </div>
  );
}

/** Vista de tabla vacía sin registros de auditoría (FC163 F2B4 Sub-Batch 4B-2). */
export function AuditLogEmpty(): React.ReactElement {
  return (
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
  );
}

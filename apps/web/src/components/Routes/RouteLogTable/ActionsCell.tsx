import React from 'react';
import { Link } from 'react-router-dom';
import { Pencil, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { RouteLog } from './types';

/** Enlace para ver el nodo de detalle de la ruta (FC163 F2B4 Sub-Batch 4B-2). */
function ViewNodeLink({ uuid }: { uuid: string }): React.JSX.Element {
  return (
    <Link
      to={`/dashboard/routes/${uuid}`}
      title="Ver nodo de ruta"
      className="flex items-center justify-center w-10 h-10 text-[#0f2a44] bg-[#0f2a44]/5 hover:bg-[#0f2a44]/10 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] group"
      onClick={(e): void => e.stopPropagation()}
    >
      <ExternalLink size={16} className="transition-transform duration-300 group-hover:scale-110" />
    </Link>
  );
}

interface InRouteActionsProps {
  log: RouteLog;
  onReport: (l: RouteLog) => void;
  onFinish: (l: RouteLog) => void;
}

/** Botones exclusivos de rutas en curso: reportar incidencia + finalizar misión (FC163 F2B4 Sub-Batch 4B-2). */
function InRouteActions({
  log,
  onReport,
  onFinish,
}: InRouteActionsProps): React.JSX.Element | null {
  if (log.end_time) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e): void => {
          e.stopPropagation();
          onReport(log);
        }}
        className="p-2.5 rounded-[4px] bg-[#0f2a44] text-white"
        title="Reportar Incidencia"
      >
        <AlertTriangle size={18} />
      </button>
      <button
        type="button"
        onClick={(e): void => {
          e.stopPropagation();
          onFinish(log);
        }}
        className="p-2.5 rounded-[4px] bg-[#0f2a44] text-white"
        title="Finalizar Misión"
      >
        <CheckCircle2 size={18} />
      </button>
    </>
  );
}

interface ActionsCellProps {
  log: RouteLog;
  className: string;
  onEdit?: (l: RouteLog) => void;
  onReport: (l: RouteLog) => void;
  onFinish: (l: RouteLog) => void;
}

/** Celda de acciones: ver nodo, reportar incidencia, editar, finalizar misión (FC163 F2B4 Sub-Batch 4B-2). */
function ActionsCell({
  log,
  className,
  onEdit,
  onReport,
  onFinish,
}: ActionsCellProps): React.JSX.Element {
  return (
    <td className={`py-6 ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <ViewNodeLink uuid={log.uuid} />
        {!log.end_time && <InRouteActions log={log} onReport={onReport} onFinish={onFinish} />}
        <button
          type="button"
          onClick={(e): void => {
            e.stopPropagation();
            onEdit?.(log);
          }}
          className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none group"
          title="Editar Ruta"
        >
          <Pencil size={18} className="transition-transform duration-300 group-hover:rotate-12" />
        </button>
      </div>
    </td>
  );
}

export default ActionsCell;

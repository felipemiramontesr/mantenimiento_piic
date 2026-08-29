import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, CheckCircle2, XCircle, Cpu, Wrench } from 'lucide-react';
import { MaintenanceLog } from '../../../types/maintenance';

/** Enlace para ver el nodo de detalle del mantenimiento (FC165 F2 Slice 2.1B). */
function ViewNodeLink({ uuid }: { uuid: string }): React.JSX.Element {
  return (
    <Link
      to={`/dashboard/maintenance/${uuid}`}
      title="Ver nodo de mantenimiento"
      className="flex items-center justify-center w-10 h-10 text-[#0f2a44] bg-[#0f2a44]/5 hover:bg-[#0f2a44]/10 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] group"
      onClick={(e): void => e.stopPropagation()}
    >
      <ExternalLink size={16} className="transition-transform duration-300 group-hover:scale-110" />
    </Link>
  );
}

interface OpenOrderActionsProps {
  uuid: string;
  logId: number;
  onAcceptOrder?: (uuid: string, logId: number) => void;
  onRejectOrder?: (uuid: string) => void;
}

/** Botones de aceptar/rechazar para órdenes OPEN asignadas al técnico (FC165 F2 Slice 2.1B). */
function OpenOrderActions({
  uuid,
  logId,
  onAcceptOrder,
  onRejectOrder,
}: OpenOrderActionsProps): React.JSX.Element {
  return (
    <>
      {onAcceptOrder && (
        <button
          type="button"
          data-testid={`accept-btn-${uuid}`}
          title="Aceptar Orden"
          onClick={(e): void => {
            e.stopPropagation();
            onAcceptOrder(uuid, logId);
          }}
          className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
        >
          <CheckCircle2 size={18} />
        </button>
      )}
      {onRejectOrder && (
        <button
          type="button"
          data-testid={`reject-btn-${uuid}`}
          title="Rechazar Orden"
          onClick={(e): void => {
            e.stopPropagation();
            onRejectOrder(uuid);
          }}
          className="flex items-center justify-center w-10 h-10 text-red-500 bg-red-50 hover:bg-red-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
        >
          <XCircle size={18} />
        </button>
      )}
    </>
  );
}

interface CompletionActionsProps {
  log: MaintenanceLog;
  isActive: boolean;
  hasUpa: boolean;
  onCompleteRequest?: (log: MaintenanceLog) => void;
  onOpenUpa?: (workOrderId: number) => void;
}

/** Botón de UPA (si aplica) o de "Finalizar Servicio" legacy (FC165 F2 Slice 2.1B). */
function CompletionActions({
  log,
  isActive,
  hasUpa,
  onCompleteRequest,
  onOpenUpa,
}: CompletionActionsProps): React.JSX.Element {
  return (
    <>
      {hasUpa && onOpenUpa && (
        <button
          type="button"
          data-testid={`open-upa-btn-${log.uuid}`}
          title="Ver Proceso UPA"
          onClick={(e): void => {
            e.stopPropagation();
            onOpenUpa(log.upa_work_order_id!);
          }}
          className="flex items-center justify-center w-10 h-10 text-sky-600 bg-sky-50 hover:bg-sky-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none"
        >
          <Cpu size={16} />
        </button>
      )}
      {isActive && !hasUpa && onCompleteRequest && (
        <button
          type="button"
          title="Finalizar Servicio"
          onClick={(e): void => {
            e.stopPropagation();
            onCompleteRequest(log);
          }}
          className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none group/complete"
        >
          <Wrench
            size={18}
            className="transition-transform duration-300 group-hover/complete:rotate-12"
          />
        </button>
      )}
    </>
  );
}

interface ActionsCellProps {
  log: MaintenanceLog;
  isOpen: boolean;
  isActive: boolean;
  hasUpa: boolean;
  onCompleteRequest?: (log: MaintenanceLog) => void;
  onAcceptOrder?: (uuid: string, logId: number) => void;
  onRejectOrder?: (uuid: string) => void;
  onOpenUpa?: (workOrderId: number) => void;
}

/** Celda de acciones: ver nodo, aceptar/rechazar orden, UPA o finalizar servicio (FC165 F2 Slice 2.1B). */
function ActionsCell({
  log,
  isOpen,
  isActive,
  hasUpa,
  onCompleteRequest,
  onAcceptOrder,
  onRejectOrder,
  onOpenUpa,
}: ActionsCellProps): React.JSX.Element {
  return (
    <td className="py-4 px-3 text-center">
      <div className="flex flex-col items-center gap-2">
        <ViewNodeLink uuid={log.uuid} />
        {isOpen && (
          <OpenOrderActions
            uuid={log.uuid}
            logId={log.id}
            onAcceptOrder={onAcceptOrder}
            onRejectOrder={onRejectOrder}
          />
        )}
        <CompletionActions
          log={log}
          isActive={isActive}
          hasUpa={hasUpa}
          onCompleteRequest={onCompleteRequest}
          onOpenUpa={onOpenUpa}
        />
      </div>
    </td>
  );
}

export default ActionsCell;

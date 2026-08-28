import React from 'react';
import { ArrowLeft, ClipboardList, XCircle, ShieldAlert } from 'lucide-react';
import type { UpaWorkOrderDetail } from '../../../types/upa';
import Stepper from './Stepper';

const STATUS_CONFIG: Record<UpaWorkOrderDetail['status'], { label: string; color: string }> = {
  IN_PROGRESS: { label: 'En Proceso', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  AWAITING_AUTH: {
    label: 'Esperando Autorización',
    color: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  },
  CLOSED: { label: 'Cerrada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

/** Botón de regreso, visible solo en modo panel embebido (FC163 F2B4 Sub-Batch 4B-2). */
function ReturnButton({ onReturn }: { onReturn: () => void }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onReturn}
      data-testid="upa-return-btn"
      className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-[#0f2a44]/50 hover:text-[#0f2a44] transition-colors"
    >
      <ArrowLeft size={14} />
      Volver a Mantenimiento
    </button>
  );
}

/** Banner de estatus de la orden (en proceso/esperando autorización/cerrada) (FC163 F2B4 Sub-Batch 4B-2). */
function OrderStatusBanner({ wo }: { wo: UpaWorkOrderDetail }): React.ReactElement {
  const sc = STATUS_CONFIG[wo.status];
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-[4px] border mb-6 ${sc.color}`}>
      <ClipboardList size={16} />
      <div>
        <span className="text-sm font-black uppercase tracking-wider block">{sc.label}</span>
        <span className="text-xs font-bold opacity-70 uppercase tracking-wide">
          Unidad: {wo.vehicleId} —{' '}
          {wo.fleetType === 'urban' ? 'Flotilla Urbana' : 'Flotilla Minería'} — OT #{wo.id}
        </span>
      </div>
    </div>
  );
}

/** Aviso de tareas pendientes de autorización gerencial, etapa 5 (FC163 F2B4 Sub-Batch 4B-2). */
function AwaitingAuthNotice(): React.ReactElement {
  return (
    <div
      data-testid="awaiting-auth-banner"
      className="flex items-start gap-3 px-4 py-4 rounded-[4px] border border-yellow-300 bg-yellow-50 text-yellow-800 mb-6"
    >
      <ShieldAlert size={20} className="shrink-0 mt-0.5" />
      <div>
        <span className="font-black text-sm uppercase tracking-wider block">
          Autorización Requerida — Etapa 5
        </span>
        <span className="text-xs font-bold opacity-80 block mt-0.5">
          Existen tareas diferidas financieramente o no aplicables estructuralmente. Requiere
          validación del gerente de flota. El sistema cerrará automáticamente la orden después de 24
          horas hábiles sin respuesta.
        </span>
      </div>
    </div>
  );
}

interface WorkspaceHeaderProps {
  wo: UpaWorkOrderDetail;
  currentStep: number;
  error: string | null;
  onReturn?: () => void;
}

/** Encabezado del workspace: back button, stepper, banners de estado/error/autorización (FC163 F2B4 Sub-Batch 4B-2). */
function WorkspaceHeader({
  wo,
  currentStep,
  error,
  onReturn,
}: WorkspaceHeaderProps): React.ReactElement {
  return (
    <>
      {onReturn && <ReturnButton onReturn={onReturn} />}
      <Stepper currentStep={currentStep} />
      <OrderStatusBanner wo={wo} />
      {error && (
        <div
          data-testid="order-error"
          className="flex items-center gap-2 px-4 py-3 rounded-[4px] border border-red-200 bg-red-50 text-red-700 mb-4"
        >
          <XCircle size={14} />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}
      {wo.status === 'AWAITING_AUTH' && <AwaitingAuthNotice />}
    </>
  );
}

export default WorkspaceHeader;

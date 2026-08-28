import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { UpaWorkOrderDetail } from '../../../types/upa';

interface CloseOrderButtonProps {
  onClose: () => void;
  closing: boolean;
  loading: boolean;
}

/** Botón para cerrar la orden UPA activa (FC163 F2B4 Sub-Batch 4B-2). */
function CloseOrderButton({
  onClose,
  closing,
  loading,
}: CloseOrderButtonProps): React.ReactElement {
  return (
    <div className="mt-10 pt-6 border-t border-slate-100">
      <button
        type="button"
        onClick={onClose}
        disabled={closing || loading}
        data-testid="close-order-btn"
        className="w-full md:w-auto px-8 py-4 font-black text-sm uppercase tracking-widest text-white bg-[#0f2a44] rounded-[4px] hover:brightness-125 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
      >
        {closing ? 'Cerrando Orden...' : 'Cerrar Orden UPA'}
      </button>
    </div>
  );
}

interface ClosedStateViewProps {
  wo: UpaWorkOrderDetail;
  onReturn?: () => void;
  onResetOrder: () => void;
}

/** Vista de confirmación tras cerrar la orden, con acción de volver/nueva orden (FC163 F2B4 Sub-Batch 4B-2). */
function ClosedStateView({ wo, onReturn, onResetOrder }: ClosedStateViewProps): React.ReactElement {
  return (
    <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col items-center gap-4 py-8">
      <CheckCircle size={52} className="text-emerald-500" />
      <p className="font-black text-lg uppercase tracking-wider text-[#0f2a44]">
        Orden Cerrada Exitosamente
      </p>
      <p className="text-sm font-bold text-[#0f2a44]/50 uppercase tracking-wide">UUID: {wo.uuid}</p>
      {onReturn ? (
        <button
          type="button"
          onClick={onReturn}
          data-testid="new-order-btn"
          className="px-8 py-3 font-black text-sm uppercase tracking-widest text-[#0f2a44] bg-[#f2b705] rounded-[4px] hover:brightness-110 transition-all shadow-md"
        >
          Volver a Mantenimiento
        </button>
      ) : (
        <button
          type="button"
          onClick={onResetOrder}
          data-testid="new-order-btn"
          className="px-8 py-3 font-black text-sm uppercase tracking-widest text-[#0f2a44] bg-[#f2b705] rounded-[4px] hover:brightness-110 transition-all shadow-md"
        >
          Nueva Orden UPA
        </button>
      )}
    </div>
  );
}

interface CloseOrderSectionProps {
  wo: UpaWorkOrderDetail;
  closing: boolean;
  loading: boolean;
  onClose: () => void;
  onReturn?: () => void;
  onResetOrder: () => void;
}

/** Sección de cierre de orden: botón de cerrar o vista de orden ya cerrada (FC163 F2B4 Sub-Batch 4B-2). */
function CloseOrderSection({
  wo,
  closing,
  loading,
  onClose,
  onReturn,
  onResetOrder,
}: CloseOrderSectionProps): React.ReactElement | null {
  if (wo.status === 'CLOSED') {
    return <ClosedStateView wo={wo} onReturn={onReturn} onResetOrder={onResetOrder} />;
  }
  return <CloseOrderButton onClose={onClose} closing={closing} loading={loading} />;
}

export default CloseOrderSection;

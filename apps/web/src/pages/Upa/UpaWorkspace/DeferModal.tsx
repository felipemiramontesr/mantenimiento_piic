import React from 'react';
import type { UpaDeferredType } from '../../../types/upa';

interface DeferTypeSelectProps {
  deferType: UpaDeferredType;
  onDeferTypeChange: (t: UpaDeferredType) => void;
}

/** Select del tipo de diferimiento (financiero/estructural) (FC163 F2B4 Sub-Batch 4B-2). */
function DeferTypeSelect({
  deferType,
  onDeferTypeChange,
}: DeferTypeSelectProps): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="defer-type-select"
        className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f2a44]/50"
      >
        Tipo de diferimiento
      </label>
      <select
        id="defer-type-select"
        value={deferType}
        onChange={(e): void => onDeferTypeChange(e.target.value as UpaDeferredType)}
        data-testid="defer-type-select"
        className="w-full px-3 py-2.5 text-sm font-bold text-[#0f2a44] border border-slate-200 rounded-[4px] bg-white focus:outline-none"
      >
        <option value="DEFERRED_FINANCIAL">Diferimiento Financiero</option>
        <option value="N_A_STRUCTURAL">No Aplica — Estructural</option>
      </select>
    </div>
  );
}

interface DeferModalActionsProps {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

/** Botones de cancelar/confirmar del modal de diferimiento (FC163 F2B4 Sub-Batch 4B-2). */
function DeferModalActions({
  onConfirm,
  onCancel,
  loading,
}: DeferModalActionsProps): React.ReactElement {
  return (
    <div className="flex gap-3 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-2.5 font-bold text-sm uppercase tracking-wider text-[#0f2a44] border border-slate-200 rounded-[4px] hover:bg-slate-50 transition-colors"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        data-testid="defer-confirm-btn"
        className="flex-1 py-2.5 font-bold text-sm uppercase tracking-wider text-white bg-[#ef4444] rounded-[4px] hover:brightness-110 transition-all disabled:opacity-50"
      >
        {loading ? 'Diferiendo...' : 'Confirmar'}
      </button>
    </div>
  );
}

interface DeferModalProps {
  taskDescription: string;
  deferType: UpaDeferredType;
  onDeferTypeChange: (t: UpaDeferredType) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

/** Modal de confirmación para diferir una tarea (financiero o estructural) (FC163 F2B4 Sub-Batch 4B-2). */
const DeferModal: React.FC<DeferModalProps> = ({
  taskDescription,
  deferType,
  onDeferTypeChange,
  onConfirm,
  onCancel,
  loading,
}) => (
  <div
    data-testid="defer-modal"
    className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
  >
    <div className="bg-white rounded-[4px] shadow-xl w-full max-w-md p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
      <h3 className="font-black uppercase tracking-tight text-[#0f2a44] text-lg">Diferir Tarea</h3>
      <p className="text-sm font-bold text-[#0f2a44]/60 uppercase tracking-wide line-clamp-2">
        {taskDescription}
      </p>
      <DeferTypeSelect deferType={deferType} onDeferTypeChange={onDeferTypeChange} />
      <DeferModalActions onConfirm={onConfirm} onCancel={onCancel} loading={loading} />
    </div>
  </div>
);

export default DeferModal;

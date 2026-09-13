import React from 'react';
import { Clock } from 'lucide-react';
import type { UpaDeferredType } from '../../../types/upa';
import ArchonField from '../../../components/ArchonField';

interface DeferTypeSelectProps {
  readonly deferType: UpaDeferredType;
  readonly onDeferTypeChange: (t: UpaDeferredType) => void;
}

/** Select del tipo de diferimiento (financiero/estructural) (FC163 F2B4 Sub-Batch 4B-2). */
function DeferTypeSelect({
  deferType,
  onDeferTypeChange,
}: DeferTypeSelectProps): React.ReactElement {
  return (
    <ArchonField label="Tipo de diferimiento" icon={Clock}>
      <select
        id="defer-type-select"
        value={deferType}
        onChange={(e): void => onDeferTypeChange(e.target.value as UpaDeferredType)}
        data-testid="defer-type-select"
        className="archon-input"
      >
        <option value="DEFERRED_FINANCIAL">Diferimiento Financiero</option>
        <option value="N_A_STRUCTURAL">No Aplica — Estructural</option>
      </select>
    </ArchonField>
  );
}

interface DeferModalActionsProps {
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly loading: boolean;
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
        className="inline-flex flex-1 items-center justify-center h-11 text-xs font-bold uppercase tracking-widest text-[#0f2a44]/50 hover:text-[#0f2a44]"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        data-testid="defer-confirm-btn"
        className="btn-sentinel-red-static flex-1 text-xs"
      >
        {loading ? 'Diferiendo...' : 'Confirmar'}
      </button>
    </div>
  );
}

interface DeferModalProps {
  readonly taskDescription: string;
  readonly deferType: UpaDeferredType;
  readonly onDeferTypeChange: (t: UpaDeferredType) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly loading: boolean;
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
    <div className="bg-white border-t-4 border-solid border-pinnacle-navy rounded-[4px] shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="card-sovereign-header !mb-2">
        <Clock size={22} className="text-pinnacle-navy" />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">Diferir Tarea</h3>
      </div>
      <p className="text-sm font-bold text-[#0f2a44]/60 uppercase tracking-wide line-clamp-2">
        {taskDescription}
      </p>
      <DeferTypeSelect deferType={deferType} onDeferTypeChange={onDeferTypeChange} />
      <DeferModalActions onConfirm={onConfirm} onCancel={onCancel} loading={loading} />
    </div>
  </div>
);

export default DeferModal;

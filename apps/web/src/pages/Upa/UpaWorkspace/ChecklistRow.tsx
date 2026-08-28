import React from 'react';
import { XCircle } from 'lucide-react';
import type { UpaTaskDetail } from '../../../types/upa';
import EvidenceInput from './EvidenceInput';
import { getStatusIcon, getStatusLabel, getDescriptionCls, getBadgeCls } from './taskHelpers';

function checklistCheckboxCls(status: UpaTaskDetail['status']): string {
  if (status === 'completed') return 'bg-emerald-500 border-emerald-500 text-white cursor-default';
  if (status === 'DEFERRED_FINANCIAL')
    return 'bg-red-100 border-red-400 text-red-500 cursor-default';
  if (status === 'N_A_STRUCTURAL')
    return 'bg-amber-100 border-amber-400 text-amber-600 cursor-default';
  return 'border-slate-300 bg-white hover:border-[#0f2a44]/60 hover:bg-[#0f2a44]/5 cursor-pointer';
}

interface ChecklistCheckboxProps {
  task: UpaTaskDetail;
  isUpdating: boolean;
  onComplete: () => void;
}

/** Checkbox de estado/completar de una tarea del checklist UPA (FC163 F2B4 Sub-Batch 4B-2). */
function ChecklistCheckbox({
  task,
  isUpdating,
  onComplete,
}: ChecklistCheckboxProps): React.ReactElement {
  const isPending = task.status === 'pending';
  const StatusIcon = getStatusIcon(task.status);
  return (
    <button
      type="button"
      data-testid={`complete-btn-${task.taskId}`}
      onClick={(): void => {
        if (isPending && !isUpdating) onComplete();
      }}
      disabled={!isPending || isUpdating}
      aria-label={isPending ? 'Marcar completada' : getStatusLabel(task.status)}
      className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 ${checklistCheckboxCls(
        task.status
      )}`}
    >
      {task.status !== 'pending' && <StatusIcon size={11} />}
      {task.status === 'pending' && isUpdating && (
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse block" />
      )}
    </button>
  );
}

interface ChecklistTrailingActionProps {
  task: UpaTaskDetail;
  isPending: boolean;
  isUpdating: boolean;
  onDefer: () => void;
}

/** Badge de estatus (no pendiente) o botón de diferir (pendiente) al final de la fila (FC163 F2B4 Sub-Batch 4B-2). */
function ChecklistTrailingAction({
  task,
  isPending,
  isUpdating,
  onDefer,
}: ChecklistTrailingActionProps): React.ReactElement | null {
  if (!isPending) {
    return (
      <span
        className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${getBadgeCls(
          task.status
        )}`}
      >
        {getStatusLabel(task.status)}
      </span>
    );
  }
  return (
    <button
      type="button"
      data-testid={`defer-btn-${task.taskId}`}
      onClick={onDefer}
      disabled={isUpdating}
      title="Diferir tarea"
      className="shrink-0 text-[#0f2a44]/25 hover:text-red-400 transition-colors disabled:opacity-50"
    >
      <XCircle size={14} />
    </button>
  );
}

interface ChecklistRowProps {
  task: UpaTaskDetail;
  isUpdating: boolean;
  evidenceUrls: string[];
  evidenceNotes: string;
  onComplete: () => void;
  onDefer: () => void;
  onEvidenceUrlsChange: (urls: string[]) => void;
  onEvidenceNotesChange: (notes: string) => void;
}

/** Fila de tarea del checklist UPA: checkbox, descripción, badge/defer, evidencia (FC163 F2B4 Sub-Batch 4B-2). */
const ChecklistRow: React.FC<ChecklistRowProps> = ({
  task,
  isUpdating,
  evidenceUrls,
  evidenceNotes,
  onComplete,
  onDefer,
  onEvidenceUrlsChange,
  onEvidenceNotesChange,
}) => {
  const isPending = task.status === 'pending';

  return (
    <div data-testid={`task-card-${task.taskId}`} className="flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3">
        <ChecklistCheckbox task={task} isUpdating={isUpdating} onComplete={onComplete} />

        <span
          className={`flex-1 text-sm font-bold leading-tight ${getDescriptionCls(task.status)}`}
        >
          {task.description}
        </span>

        <ChecklistTrailingAction
          task={task}
          isPending={isPending}
          isUpdating={isUpdating}
          onDefer={onDefer}
        />
      </div>

      {task.stage === 'closure' && isPending && (
        <div className="px-4 pb-3">
          <EvidenceInput
            urls={evidenceUrls}
            notes={evidenceNotes}
            onUrlsChange={onEvidenceUrlsChange}
            onNotesChange={onEvidenceNotesChange}
          />
        </div>
      )}
    </div>
  );
};

export default ChecklistRow;

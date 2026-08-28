import React from 'react';
import { useUpaOrder } from '../../hooks/useUpaOrder';
import type { UpaWorkOrderDetail, UpaTaskDetail, UpaTaskStage } from '../../types/upa';
import { STAGE_ORDER, computeStep } from './UpaWorkspace/stageConfig';
import InitForm from './UpaWorkspace/InitForm';
import WorkspaceHeader from './UpaWorkspace/WorkspaceHeader';
import TaskAccordion from './UpaWorkspace/TaskAccordion';
import CloseOrderSection from './UpaWorkspace/CloseOrderSection';
import DeferModal from './UpaWorkspace/DeferModal';
import { useUpaWorkspaceState, UpaWorkspaceState } from './UpaWorkspace/useUpaWorkspaceState';

export { getStatusLabel } from './UpaWorkspace/taskHelpers';

interface UpaWorkspaceProps {
  workOrderId?: number;
  onReturn?: () => void;
}

function buildTasksByStage(tasks: UpaTaskDetail[]): Record<UpaTaskStage, UpaTaskDetail[]> {
  return STAGE_ORDER.reduce<Record<UpaTaskStage, UpaTaskDetail[]>>(
    (acc, stage) => ({ ...acc, [stage]: tasks.filter((t) => t.stage === stage) }),
    {} as Record<UpaTaskStage, UpaTaskDetail[]>
  );
}

interface LoadedWorkspaceProps {
  wo: UpaWorkOrderDetail;
  upa: ReturnType<typeof useUpaOrder>;
  state: UpaWorkspaceState;
  onReturn?: () => void;
}

/** Contenido del workspace una vez la orden está cargada (FC163 F2B4 Sub-Batch 4B-2). */
function LoadedWorkspace({ wo, upa, state, onReturn }: LoadedWorkspaceProps): React.ReactElement {
  const currentStep = computeStep(wo);
  const tasksByStage = buildTasksByStage(wo.tasks);
  const deferringInFlight = state.deferTaskId ? !!upa.taskUpdating[state.deferTaskId] : false;
  const deferringTaskObj = state.deferTaskId
    ? wo.tasks.find((t) => t.taskId === state.deferTaskId)
    : null;

  return (
    <div className="animate-in fade-in duration-700">
      <WorkspaceHeader wo={wo} currentStep={currentStep} error={upa.error} onReturn={onReturn} />

      <TaskAccordion
        stageOrder={STAGE_ORDER}
        tasksByStage={tasksByStage}
        openStages={state.openStages}
        onToggleStage={state.toggleStage}
        taskUpdating={upa.taskUpdating}
        evidenceUrls={state.evidenceUrls}
        evidenceNotes={state.evidenceNotes}
        onComplete={state.handleComplete}
        onDefer={state.setDeferTaskId}
        onEvidenceUrlsChange={(taskId, urls): void =>
          state.setEvidenceUrls((prev) => ({ ...prev, [taskId]: urls }))
        }
        onEvidenceNotesChange={(taskId, notes): void =>
          state.setEvidenceNotes((prev) => ({ ...prev, [taskId]: notes }))
        }
      />

      <CloseOrderSection
        wo={wo}
        closing={upa.closingOrder}
        loading={upa.loading}
        onClose={(): void => {
          upa.closeCurrentOrder();
        }}
        onReturn={onReturn}
        onResetOrder={upa.resetOrder}
      />

      {state.deferTaskId && deferringTaskObj && (
        <DeferModal
          taskDescription={deferringTaskObj.description}
          deferType={state.deferType}
          onDeferTypeChange={state.setDeferType}
          onConfirm={state.handleDeferConfirm}
          onCancel={(): void => state.setDeferTaskId(null)}
          loading={deferringInFlight}
        />
      )}
    </div>
  );
}

/** Workspace del pipeline UPA: init, stepper, acordeón de tareas, cierre (FC163 F2B4 Sub-Batch 4B-2). */
const UpaWorkspace: React.FC<UpaWorkspaceProps> = ({
  workOrderId,
  onReturn,
}): React.ReactElement => {
  const upa = useUpaOrder();
  const state = useUpaWorkspaceState(upa, workOrderId);

  if (!upa.workOrder) {
    if (workOrderId !== undefined) {
      return (
        <div className="flex items-center justify-center py-16 text-[#0f2a44]/40 font-bold text-sm uppercase tracking-wider">
          {upa.loading ? 'Cargando orden UPA...' : upa.error ?? 'Orden no encontrada'}
        </div>
      );
    }
    return <InitForm onSubmit={upa.startOrder} loading={upa.initLoading} error={upa.error} />;
  }

  return <LoadedWorkspace wo={upa.workOrder} upa={upa} state={state} onReturn={onReturn} />;
};

export default UpaWorkspace;

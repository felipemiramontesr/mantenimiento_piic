import React from 'react';
import { ListChecks, ChevronDown, ChevronUp } from 'lucide-react';
import { UpaPreviewTask, UpaTaskStage } from '../../../types/maintenance';
import ArchonSelect, { SelectOption } from '../../ArchonSelect';
import { RegistrationState } from './useRegistrationState';
import { UPA_STAGE_ORDER, UPA_STAGE_LABELS, UPA_STAGE_ICONS } from './constants';

interface TaskRowProps {
  readonly task: UpaPreviewTask;
  readonly upaStatusOptions: SelectOption[];
  readonly details: { taskCode: string; status: string }[];
  readonly onDetailChange: (taskId: string, value: string) => void;
}

/** Fila de una tarea UPA individual dentro de una etapa expandida
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function TaskRow({
  task,
  upaStatusOptions,
  details,
  onDetailChange,
}: TaskRowProps): React.JSX.Element {
  const StageIcon = UPA_STAGE_ICONS[task.stage];
  return (
    <div className="px-5 py-4 flex items-center gap-3 hover:bg-[#0f2a44]/[0.02] transition-colors duration-200">
      <StageIcon size={13} className="text-[#f2b705] shrink-0" />
      <span className="flex-1 text-archon-lg text-[#0f2a44] min-w-0">{task.description}</span>
      <div className="w-52 shrink-0">
        <ArchonSelect
          options={upaStatusOptions}
          value={details.find((d) => d.taskCode === task.id)?.status ?? 'PASS'}
          onChange={(val: string): void => onDetailChange(task.id, val)}
          searchable={false}
        />
      </div>
    </div>
  );
}

interface StageAccordionProps {
  readonly stage: UpaTaskStage;
  readonly tasks: UpaPreviewTask[];
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly upaStatusOptions: SelectOption[];
  readonly details: { taskCode: string; status: string }[];
  readonly onDetailChange: (taskId: string, value: string) => void;
}

/** Sección colapsable de una etapa UPA (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function StageAccordion({
  stage,
  tasks,
  isOpen,
  onToggle,
  upaStatusOptions,
  details,
  onDetailChange,
}: StageAccordionProps): React.JSX.Element {
  return (
    <div className="border border-[#0f2a44]/10 rounded-[4px] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-[#0f2a44]/[0.03] hover:bg-[#0f2a44]/[0.06] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-archon-md font-black text-[#0f2a44] uppercase tracking-[0.15em]">
            {UPA_STAGE_LABELS[stage]}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#0f2a44]/10 text-[#0f2a44] text-archon-sm font-black">
            {tasks.length}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp size={14} className="text-[#0f2a44]/40 shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-[#0f2a44]/40 shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="divide-y divide-[#0f2a44]/5">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              upaStatusOptions={upaStatusOptions}
              details={details}
              onDetailChange={onDetailChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Lista de etapas con tareas UPA, cada una colapsable
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function UpaStageList({
  upaPreview,
  state,
}: {
  readonly upaPreview: UpaPreviewTask[];
  readonly state: RegistrationState;
}): React.JSX.Element {
  return (
    <div className="px-10 pb-10 space-y-2">
      {UPA_STAGE_ORDER.filter((stage) => upaPreview.some((t) => t.stage === stage)).map((stage) => (
        <StageAccordion
          key={stage}
          stage={stage}
          tasks={upaPreview.filter((t) => t.stage === stage)}
          isOpen={state.openPreviewStages[stage]}
          onToggle={(): void =>
            state.setOpenPreviewStages((prev) => ({ ...prev, [stage]: !prev[stage] }))
          }
          upaStatusOptions={state.upaStatusOptions}
          details={state.details}
          onDetailChange={state.handleUpaDetailChange}
        />
      ))}
    </div>
  );
}

/** Sección "Revisión de Tareas UPA": carga/vacío/lista de etapas
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function UpaPreviewSection({ state }: { state: RegistrationState }): React.JSX.Element | null {
  if (!state.selectedUnit) return null;
  return (
    <div className="card-archon-sovereign bg-white relative z-0 [--card-accent:#0f2a44]">
      <div className="card-sovereign-header p-10 pb-6">
        <ListChecks className="text-[var(--card-accent)]" size={22} />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">REVISIÓN DE TAREAS UPA</h3>
      </div>
      {state.upaPreviewLoading && (
        <div className="px-10 pb-10 text-center text-archon-base font-black text-[#0f2a44]/40 uppercase tracking-[0.2em]">
          Calculando tareas UPA...
        </div>
      )}
      {!state.upaPreviewLoading && state.upaPreview !== null && state.upaPreview.length === 0 && (
        <div className="px-10 pb-10 text-center text-archon-base font-black text-[#0f2a44]/30 uppercase tracking-[0.2em]">
          Sin tareas UPA para esta unidad.
        </div>
      )}
      {!state.upaPreviewLoading && state.upaPreview !== null && state.upaPreview.length > 0 && (
        <UpaStageList upaPreview={state.upaPreview} state={state} />
      )}
    </div>
  );
}

export default UpaPreviewSection;

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { UpaTaskDetail, UpaTaskStage } from '../../../types/upa';
import { STAGE_ICONS, STAGE_LABELS, STAGE_STEP } from './stageConfig';
import ChecklistRow from './ChecklistRow';

interface AccordionSectionHeaderProps {
  stage: UpaTaskStage;
  pendingCount: number;
  isOpen: boolean;
  onToggle: () => void;
}

/** Botón de encabezado desplegable de una sección del acordeón (FC163 F2B4 Sub-Batch 4B-2). */
function AccordionSectionHeader({
  stage,
  pendingCount,
  isOpen,
  onToggle,
}: AccordionSectionHeaderProps): React.ReactElement {
  const StageIcon = STAGE_ICONS[stage];
  return (
    <button
      type="button"
      data-testid={`accordion-toggle-${stage}`}
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left border-none outline-none cursor-pointer"
    >
      <StageIcon size={15} className="text-[#0f2a44]/60 shrink-0" />
      <span className="font-black uppercase tracking-[0.15em] text-[#0f2a44] text-sm flex-1">
        Etapa {STAGE_STEP[stage]}: {STAGE_LABELS[stage]}
      </span>
      <span className="text-[10px] font-bold text-[#0f2a44]/40 uppercase tracking-wider">
        {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
      </span>
      {isOpen ? (
        <ChevronDown size={14} className="text-[#0f2a44]/40 shrink-0" />
      ) : (
        <ChevronRight size={14} className="text-[#0f2a44]/40 shrink-0" />
      )}
    </button>
  );
}

interface AccordionSectionTasksProps {
  stage: UpaTaskStage;
  tasks: UpaTaskDetail[];
  taskUpdating: Record<string, boolean>;
  evidenceUrls: Record<string, string[]>;
  evidenceNotes: Record<string, string>;
  onComplete: (task: UpaTaskDetail) => void;
  onDefer: (taskId: string) => void;
  onEvidenceUrlsChange: (taskId: string, urls: string[]) => void;
  onEvidenceNotesChange: (taskId: string, notes: string) => void;
}

/** Lista de filas de tarea dentro de una sección desplegada del acordeón (FC163 F2B4 Sub-Batch 4B-2). */
function AccordionSectionTasks({
  stage,
  tasks,
  taskUpdating,
  evidenceUrls,
  evidenceNotes,
  onComplete,
  onDefer,
  onEvidenceUrlsChange,
  onEvidenceNotesChange,
}: AccordionSectionTasksProps): React.ReactElement {
  return (
    <div
      data-testid={`accordion-content-${stage}`}
      className="divide-y divide-slate-100 animate-in fade-in duration-200"
    >
      {tasks.map((task) => (
        <ChecklistRow
          key={task.taskId}
          task={task}
          isUpdating={!!taskUpdating[task.taskId]}
          evidenceUrls={evidenceUrls[task.taskId] ?? []}
          evidenceNotes={evidenceNotes[task.taskId] ?? ''}
          onComplete={(): void => onComplete(task)}
          onDefer={(): void => onDefer(task.taskId)}
          onEvidenceUrlsChange={(urls): void => onEvidenceUrlsChange(task.taskId, urls)}
          onEvidenceNotesChange={(notes): void => onEvidenceNotesChange(task.taskId, notes)}
        />
      ))}
    </div>
  );
}

interface AccordionSectionProps {
  stage: UpaTaskStage;
  tasks: UpaTaskDetail[];
  isOpen: boolean;
  onToggle: () => void;
  taskUpdating: Record<string, boolean>;
  evidenceUrls: Record<string, string[]>;
  evidenceNotes: Record<string, string>;
  onComplete: (task: UpaTaskDetail) => void;
  onDefer: (taskId: string) => void;
  onEvidenceUrlsChange: (taskId: string, urls: string[]) => void;
  onEvidenceNotesChange: (taskId: string, notes: string) => void;
}

/** Sección acordeón de una etapa: header desplegable + filas de tareas (FC163 F2B4 Sub-Batch 4B-2). */
function AccordionSection({
  stage,
  tasks,
  isOpen,
  onToggle,
  taskUpdating,
  evidenceUrls,
  evidenceNotes,
  onComplete,
  onDefer,
  onEvidenceUrlsChange,
  onEvidenceNotesChange,
}: AccordionSectionProps): React.ReactElement {
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;

  return (
    <div
      data-testid={`accordion-${stage}`}
      className="border border-slate-200 rounded-[4px] overflow-hidden"
    >
      <AccordionSectionHeader
        stage={stage}
        pendingCount={pendingCount}
        isOpen={isOpen}
        onToggle={onToggle}
      />
      {isOpen && (
        <AccordionSectionTasks
          stage={stage}
          tasks={tasks}
          taskUpdating={taskUpdating}
          evidenceUrls={evidenceUrls}
          evidenceNotes={evidenceNotes}
          onComplete={onComplete}
          onDefer={onDefer}
          onEvidenceUrlsChange={onEvidenceUrlsChange}
          onEvidenceNotesChange={onEvidenceNotesChange}
        />
      )}
    </div>
  );
}

interface TaskAccordionProps {
  stageOrder: UpaTaskStage[];
  tasksByStage: Record<UpaTaskStage, UpaTaskDetail[]>;
  openStages: Record<UpaTaskStage, boolean>;
  onToggleStage: (stage: UpaTaskStage) => void;
  taskUpdating: Record<string, boolean>;
  evidenceUrls: Record<string, string[]>;
  evidenceNotes: Record<string, string>;
  onComplete: (task: UpaTaskDetail) => void;
  onDefer: (taskId: string) => void;
  onEvidenceUrlsChange: (taskId: string, urls: string[]) => void;
  onEvidenceNotesChange: (taskId: string, notes: string) => void;
}

/** Acordeón de etapas del pipeline UPA, cada una con sus tareas (FC163 F2B4 Sub-Batch 4B-2). */
function TaskAccordion({
  stageOrder,
  tasksByStage,
  openStages,
  onToggleStage,
  taskUpdating,
  evidenceUrls,
  evidenceNotes,
  onComplete,
  onDefer,
  onEvidenceUrlsChange,
  onEvidenceNotesChange,
}: TaskAccordionProps): React.ReactElement {
  return (
    <div className="space-y-3" data-testid="upa-accordion">
      {stageOrder.map((stage) => {
        const tasks = tasksByStage[stage];
        if (tasks.length === 0) return null;
        return (
          <AccordionSection
            key={stage}
            stage={stage}
            tasks={tasks}
            isOpen={openStages[stage]}
            onToggle={(): void => onToggleStage(stage)}
            taskUpdating={taskUpdating}
            evidenceUrls={evidenceUrls}
            evidenceNotes={evidenceNotes}
            onComplete={onComplete}
            onDefer={onDefer}
            onEvidenceUrlsChange={onEvidenceUrlsChange}
            onEvidenceNotesChange={onEvidenceNotesChange}
          />
        );
      })}
    </div>
  );
}

export default TaskAccordion;

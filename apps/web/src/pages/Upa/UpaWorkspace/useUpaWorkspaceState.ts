import { useState, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { useUpaOrder } from '../../../hooks/useUpaOrder';
import type { UpaTaskDetail, UpaDeferredType, UpaTaskStage } from '../../../types/upa';

type Upa = ReturnType<typeof useUpaOrder>;

export interface UpaWorkspaceState {
  deferTaskId: string | null;
  setDeferTaskId: (id: string | null) => void;
  deferType: UpaDeferredType;
  setDeferType: (t: UpaDeferredType) => void;
  evidenceUrls: Record<string, string[]>;
  setEvidenceUrls: Dispatch<SetStateAction<Record<string, string[]>>>;
  evidenceNotes: Record<string, string>;
  setEvidenceNotes: Dispatch<SetStateAction<Record<string, string>>>;
  openStages: Record<UpaTaskStage, boolean>;
  toggleStage: (stage: UpaTaskStage) => void;
  handleComplete: (task: UpaTaskDetail) => void;
  handleDeferConfirm: () => void;
}

const INITIAL_OPEN_STAGES: Record<UpaTaskStage, boolean> = {
  triage: true,
  minor_service: false,
  cascade: false,
  deferred: false,
  closure: false,
};

/** Auto-carga la orden cuando se provee workOrderId (modo embebido, salta InitForm) (FC163 F2B4 Sub-Batch 4B-2). */
function useAutoLoadOrder(upa: Upa, workOrderId: number | undefined): void {
  useEffect(() => {
    if (workOrderId !== undefined && upa.workOrder === null && !upa.loading) {
      upa.loadOrder(workOrderId);
    }
  }, [workOrderId, upa.workOrder, upa.loading, upa.loadOrder]);
}

/** Estado de expansión de las secciones del acordeón (FC163 F2B4 Sub-Batch 4B-2). */
function useAccordionState(): {
  openStages: Record<UpaTaskStage, boolean>;
  toggleStage: (stage: UpaTaskStage) => void;
} {
  const [openStages, setOpenStages] = useState(INITIAL_OPEN_STAGES);
  const toggleStage = (stage: UpaTaskStage): void => {
    setOpenStages((prev) => ({ ...prev, [stage]: !prev[stage] }));
  };
  return { openStages, toggleStage };
}

/** Estado de URLs/notas de evidencia + handler de completar tarea (FC163 F2B4 Sub-Batch 4B-2). */
function useEvidenceState(upa: Upa): {
  evidenceUrls: Record<string, string[]>;
  setEvidenceUrls: Dispatch<SetStateAction<Record<string, string[]>>>;
  evidenceNotes: Record<string, string>;
  setEvidenceNotes: Dispatch<SetStateAction<Record<string, string>>>;
  handleComplete: (task: UpaTaskDetail) => void;
} {
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string[]>>({});
  const [evidenceNotes, setEvidenceNotes] = useState<Record<string, string>>({});

  const handleComplete = useCallback(
    (task: UpaTaskDetail): void => {
      const urls = (evidenceUrls[task.taskId] ?? []).filter((u) => u.trim().length > 0);
      const notes = evidenceNotes[task.taskId] ?? '';
      upa.completeTask(task.taskId, urls.length > 0 ? urls : undefined, notes || undefined);
    },
    [upa, evidenceUrls, evidenceNotes]
  );

  return { evidenceUrls, setEvidenceUrls, evidenceNotes, setEvidenceNotes, handleComplete };
}

/** Estado de diferimiento de tarea (modal) + handler de confirmación (FC163 F2B4 Sub-Batch 4B-2). */
function useDeferState(upa: Upa): {
  deferTaskId: string | null;
  setDeferTaskId: (id: string | null) => void;
  deferType: UpaDeferredType;
  setDeferType: (t: UpaDeferredType) => void;
  handleDeferConfirm: () => void;
} {
  const [deferTaskId, setDeferTaskId] = useState<string | null>(null);
  const [deferType, setDeferType] = useState<UpaDeferredType>('DEFERRED_FINANCIAL');

  const handleDeferConfirm = useCallback((): void => {
    if (!deferTaskId) return;
    upa.deferTask(deferTaskId, deferType).then(() => {
      setDeferTaskId(null);
    });
  }, [deferTaskId, deferType, upa]);

  return { deferTaskId, setDeferTaskId, deferType, setDeferType, handleDeferConfirm };
}

/** Estado de UI (defer/evidencia/acordeón) + handlers del workspace UPA (FC163 F2B4 Sub-Batch 4B-2). */
export function useUpaWorkspaceState(upa: Upa, workOrderId: number | undefined): UpaWorkspaceState {
  useAutoLoadOrder(upa, workOrderId);
  const defer = useDeferState(upa);
  const evidence = useEvidenceState(upa);
  const accordion = useAccordionState();

  return { ...defer, ...evidence, ...accordion };
}

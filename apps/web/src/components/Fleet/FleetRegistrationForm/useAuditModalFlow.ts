import React from 'react';
import api from '../../../api/client';
import { UseFleetFormReturn, CreateFleetUnit } from '../../../types/fleet';

const extractApiError = (err: unknown): string => {
  const errData = (err as { response?: { data?: { error?: string; details?: unknown } } }).response
    ?.data;
  if (errData?.details) return `${errData.error} — ${JSON.stringify(errData.details)}`;
  return errData?.error ?? (err instanceof Error ? err.message : 'Error al sincronizar la unidad');
};

async function performDelete(
  unitId: string | undefined,
  reason: string,
  setError: UseFleetFormReturn['setError'],
  onSuccess: () => Promise<void>
): Promise<void> {
  try {
    await api.delete(`/fleet/${unitId}`, { data: { reason } });
    await onSuccess();
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
      (err instanceof Error ? err.message : 'Error al eliminar la unidad');
    setError(msg);
  }
}

async function performAudit(
  unitId: string | undefined,
  formData: CreateFleetUnit,
  reason: string,
  setError: UseFleetFormReturn['setError'],
  onSuccess: () => Promise<void>
): Promise<void> {
  try {
    await api.patch(`/fleet/${unitId}`, { data: formData, reason });
    await onSuccess();
  } catch (err: unknown) {
    setError(extractApiError(err));
  }
}

async function submitNewUnit(
  e: React.FormEvent,
  handleSubmit: UseFleetFormReturn['handleSubmit'],
  onSuccess: () => Promise<void>
): Promise<void> {
  try {
    await handleSubmit(e, onSuccess);
  } catch {
    // Logic handled by hook state
  }
}

/** Título del modal de justificación según la acción (actualización vs baja). */
export function auditModalTitle(
  auditAction: 'UPDATE' | 'DELETE',
  unitId: string | undefined
): string {
  return auditAction === 'UPDATE'
    ? `Actualización técnica para el activo ${unitId}`
    : `Baja definitiva del activo ${unitId} del inventario industrial`;
}

export interface AuditModalFlowParams {
  isEdit: boolean;
  unitId: string | undefined;
  formData: CreateFleetUnit;
  setError: UseFleetFormReturn['setError'];
  onSuccess: () => Promise<void>;
  handleSubmit: UseFleetFormReturn['handleSubmit'];
}

export interface AuditModalFlowResult {
  isAuditModalOpen: boolean;
  auditAction: 'UPDATE' | 'DELETE';
  capturedReason: string | null;
  isProcessing: boolean;
  requestDelete: () => void;
  closeModal: () => void;
  confirmModal: (reason: string) => Promise<void>;
  handleFormSubmit: (e: React.FormEvent) => Promise<void>;
}

interface AuditModalFlowActions {
  requestDelete: () => void;
  closeModal: () => void;
  confirmModal: (reason: string) => Promise<void>;
  handleFormSubmit: (e: React.FormEvent) => Promise<void>;
}

interface AuditModalState {
  auditAction: 'UPDATE' | 'DELETE';
  capturedReason: string | null;
  setAuditAction: React.Dispatch<React.SetStateAction<'UPDATE' | 'DELETE'>>;
  setIsAuditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCapturedReason: React.Dispatch<React.SetStateAction<string | null>>;
  runWithProcessing: (action: () => Promise<void>) => Promise<void>;
}

/** Construye handleFormSubmit + requestDelete/closeModal/confirmModal (lógica pura, sin hooks). */
function buildAuditModalFlow(
  params: AuditModalFlowParams,
  state: AuditModalState
): AuditModalFlowActions {
  const { isEdit, unitId, formData, setError, onSuccess, handleSubmit } = params;
  const {
    auditAction,
    capturedReason,
    setAuditAction,
    setIsAuditModalOpen,
    setCapturedReason,
    runWithProcessing,
  } = state;

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!isEdit) {
      await submitNewUnit(e, handleSubmit, onSuccess);
      return;
    }
    if (capturedReason !== null) {
      await runWithProcessing(() =>
        performAudit(unitId, formData, capturedReason, setError, onSuccess)
      );
      return;
    }
    setAuditAction('UPDATE');
    setIsAuditModalOpen(true);
  };

  return {
    requestDelete: (): void => {
      setAuditAction('DELETE');
      setIsAuditModalOpen(true);
    },
    closeModal: (): void => setIsAuditModalOpen(false),
    confirmModal: (reason: string): Promise<void> => {
      if (auditAction === 'UPDATE') {
        setCapturedReason(reason);
        setIsAuditModalOpen(false);
        return Promise.resolve();
      }
      return runWithProcessing(() => performDelete(unitId, reason, setError, onSuccess));
    },
    handleFormSubmit,
  };
}

/** Estado + orquestación de alta/edición, borrado y justificación de auditoría (modal). */
export function useAuditModalFlow(params: AuditModalFlowParams): AuditModalFlowResult {
  const [isAuditModalOpen, setIsAuditModalOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [auditAction, setAuditAction] = React.useState<'UPDATE' | 'DELETE'>('UPDATE');
  const [capturedReason, setCapturedReason] = React.useState<string | null>(null);

  const runWithProcessing = async (action: () => Promise<void>): Promise<void> => {
    setIsProcessing(true);
    await action();
    setIsProcessing(false);
    setIsAuditModalOpen(false);
  };

  const actions = buildAuditModalFlow(params, {
    auditAction,
    capturedReason,
    setAuditAction,
    setIsAuditModalOpen,
    setCapturedReason,
    runWithProcessing,
  });

  return { isAuditModalOpen, auditAction, capturedReason, isProcessing, ...actions };
}

export default useAuditModalFlow;

import api from '../../../api/client';
import { archonCache } from '../../../utils/archonCache';
import { RouteLog } from '../RouteLogTable';
import { CatalogOption } from '../../../types/fleet';
import { FinishRoutePayload, StartRoutePayload } from '../../../types/route';
import { RouteAssignmentFormData } from './types';
import { getFinalDestination } from './routeValidation';
import roundToTwo from './routeMath';

/** Cierra una misión activa en edición. `routeToEdit: RouteLog` (no
 * `| null`) por TIPO: el único call-site real (`handleSubmit`) ya narrowed
 * `routeToEdit` dentro de su bloque `if (isEdit && routeToEdit)` — el guard
 * `if (!routeToEdit) return` que existía aquí antes era, por construcción,
 * inalcanzable (FC165 F3 Slice3.2 Batch1, purga sintáctica por tipo). */
export async function finishMission(
  routeToEdit: RouteLog,
  formData: RouteAssignmentFormData,
  finishRoute: (uuid: string, payload: FinishRoutePayload) => Promise<void>
): Promise<void> {
  await finishRoute(routeToEdit.uuid, {
    endReading: Number(formData.endReading),
    fuelLevelEnd: roundToTwo(formData.arrivalFuelLevel),
    fuelLitersLoaded: roundToTwo(formData.fuelLitersLoaded),
    fuelAmount: roundToTwo(formData.fuelAmount),
    fuelTicketImage: formData.fuelTicketImage || undefined,
    additivesCheck: formData.additivesCheck,
    tirePressureJson: formData.tirePressureJson || undefined,
    checklistJson: formData.checklistJson || undefined,
  });
}

/** Corrige el destino de una misión activa (aún sin `endReading`) —
 * ver nota de `finishMission` sobre el tipo no-nulo de `routeToEdit`. */
export async function correctActiveMission(
  routeToEdit: RouteLog,
  formData: RouteAssignmentFormData,
  origins: CatalogOption[],
  finalDest: string,
  refreshUnits: () => Promise<void>
): Promise<void> {
  const { origin: _origin, calle: _c, numero: _n, numeroInterior: _ni, ...rest } = formData;
  await api.put(`/routes/${routeToEdit.uuid}`, {
    data: {
      ...rest,
      destination: finalDest,
      destinationNeighborhoodId: formData.destinationNeighborhoodId
        ? Number(formData.destinationNeighborhoodId)
        : null,
      operatorId: formData.operatorId ? Number(formData.operatorId) : undefined,
      originId: origins.find((o) => o.label === formData.origin)?.id
        ? Number(origins.find((o) => o.label === formData.origin)?.id)
        : undefined,
      fuelLevel: roundToTwo(formData.fuelLevel),
      fuelLitersLoaded: roundToTwo(formData.fuelLitersLoaded),
      fuelAmount: roundToTwo(formData.fuelAmount),
    },
    // FC 076 F3 (R5) — el schema del PUT exige reason ≥5 (auditoría
    // forense); este call-site lo omitía → 400 siempre (su hermano de
    // triggerAuditUpdate sí lo manda, capturado del modal).
    reason: 'Corrección de destino de misión activa',
  });
  await refreshUnits();
}

/** Payload forense de cierre/corrección — extraído de
 * `useRouteAssignmentControl`'s `getForensicPayload` (FC165 F3 Slice3.2
 * Batch1, Dual-Gate Isolation: la función madre excedía 50 LOC de Gate2). */
export function buildForensicPayload(
  formData: RouteAssignmentFormData,
  origins: CatalogOption[],
  isFinished: boolean
): Record<string, unknown> {
  const originId = origins.find((o) => o.label === formData.origin)?.id;
  const {
    origin: _origin,
    calle: _calle,
    numero: _numero,
    numeroInterior: _numeroInterior,
    ...rest
  } = formData;

  const finalDest = getFinalDestination(formData);
  const fuelValToSend = isFinished ? formData.arrivalFuelLevel : formData.fuelLevel;

  return {
    ...rest,
    destination: finalDest,
    operatorId: formData.operatorId ? Number(formData.operatorId) : undefined,
    originId: originId ? Number(originId) : undefined,
    destinationNeighborhoodId: formData.destinationNeighborhoodId
      ? Number(formData.destinationNeighborhoodId)
      : null,
    fuelLevel: roundToTwo(fuelValToSend),
    fuelLitersLoaded: roundToTwo(formData.fuelLitersLoaded),
    fuelAmount: roundToTwo(formData.fuelAmount),
    startReading: Number(formData.startReading || 0),
    endReading: Number(formData.endReading || 0),
    additivesCheck: formData.additivesCheck ? 1 : 0,
    tirePressureJson: formData.tirePressureJson || null,
    checklistJson: formData.checklistJson || null,
  };
}

export interface AuditRequestContext {
  reason: string;
  auditAction: 'UPDATE' | 'DELETE';
  formData: RouteAssignmentFormData;
  origins: CatalogOption[];
  isFinished: boolean;
  routeToEdit: RouteLog | null | undefined;
}

export interface AuditRequestHandlers {
  validateTelemetry: () => boolean;
  refreshUnits: () => Promise<void>;
  onClose: () => void;
  setError: (msg: string | null) => void;
  setSubmitting: (v: boolean) => void;
  setIsAuditModalOpen: (v: boolean) => void;
}

/** Cuerpo de `handleConfirmAudit` — extraído por la misma razón que
 * `buildForensicPayload` (Dual-Gate Isolation). */
export async function confirmAuditRequest(
  ctx: AuditRequestContext,
  handlers: AuditRequestHandlers
): Promise<void> {
  const { reason, auditAction, formData, origins, isFinished, routeToEdit } = ctx;
  const { validateTelemetry, refreshUnits, onClose, setError, setSubmitting, setIsAuditModalOpen } =
    handlers;

  if (!reason || reason.length < 5) {
    setError('La justificación debe tener al menos 5 caracteres.');
    return;
  }
  if (auditAction === 'UPDATE' && !validateTelemetry()) {
    return;
  }

  setSubmitting(true);
  setError(null);

  try {
    if (auditAction === 'UPDATE') {
      const payload = buildForensicPayload(formData, origins, isFinished);
      await api.put(`/routes/${routeToEdit?.uuid}`, { data: payload, reason });
    } else {
      await api.delete(`/routes/${routeToEdit?.uuid}`, { data: { reason } });
    }

    archonCache.clear('forensic_journal_logs');
    await refreshUnits();

    setSubmitting(false);
    setIsAuditModalOpen(false);
    onClose();
  } catch (err: unknown) {
    setSubmitting(false);
    const axiosError = err as { response?: { data?: { message?: string } } };
    const serverMsg = axiosError.response?.data?.message;
    const msg =
      serverMsg || (err instanceof Error ? err.message : 'Error en el protocolo de auditoría');
    setError(msg);
    // DO NOT close modal, allow user to correct or retry
  }
}

async function dispatchNewRoute(
  formData: RouteAssignmentFormData,
  origins: CatalogOption[],
  finalDest: string,
  startRoute: (payload: StartRoutePayload) => Promise<void>
): Promise<void> {
  await startRoute({
    unitId: formData.unitId,
    driverId: Number(formData.operatorId),
    startReading: Number(formData.startReading),
    fuelLevelStart: roundToTwo(formData.fuelLevel),
    destination: finalDest,
    destinationNeighborhoodId: formData.destinationNeighborhoodId
      ? Number(formData.destinationNeighborhoodId)
      : undefined,
    originId: origins.find((o) => o.label === formData.origin)?.id
      ? Number(origins.find((o) => o.label === formData.origin)?.id)
      : undefined,
  });
}

export interface SubmitContext {
  formData: RouteAssignmentFormData;
  isFinished: boolean;
  isEdit: boolean;
  routeToEdit: RouteLog | null;
  origins: CatalogOption[];
}

export interface SubmitHandlers {
  validateTelemetry: () => boolean;
  setAuditAction: (a: 'UPDATE' | 'DELETE') => void;
  setIsAuditModalOpen: (v: boolean) => void;
  setSubmitting: (v: boolean) => void;
  setError: (msg: string | null) => void;
  finishRoute: (uuid: string, payload: FinishRoutePayload) => Promise<void>;
  refreshUnits: () => Promise<void>;
  startRoute: (payload: StartRoutePayload) => Promise<void>;
  onClose: () => void;
}

/** Cuerpo de `handleSubmit` (el `preventDefault` queda en el hook, junto al
 * evento) — extraído por la misma razón que `buildForensicPayload`
 * (Dual-Gate Isolation, FC165 F3 Slice3.2 Batch1). */
export async function submitRouteChanges(
  ctx: SubmitContext,
  handlers: SubmitHandlers
): Promise<void> {
  const { formData, isFinished, isEdit, routeToEdit, origins } = ctx;
  const {
    validateTelemetry,
    setAuditAction,
    setIsAuditModalOpen,
    setSubmitting,
    setError,
    finishRoute,
    refreshUnits,
    startRoute,
    onClose,
  } = handlers;

  if (!validateTelemetry()) return;
  if (isFinished) {
    setAuditAction('UPDATE');
    setIsAuditModalOpen(true);
    return;
  }

  setSubmitting(true);
  setError(null);

  try {
    const finalDest = getFinalDestination(formData);

    if (isEdit && routeToEdit) {
      if (Number(formData.endReading) > 0) {
        await finishMission(routeToEdit, formData, finishRoute);
      } else {
        await correctActiveMission(routeToEdit, formData, origins, finalDest, refreshUnits);
      }
    } else {
      await dispatchNewRoute(formData, origins, finalDest, startRoute);
    }

    archonCache.clear('forensic_journal_logs');
    onClose();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error en la operación';
    setError(msg);
  } finally {
    setSubmitting(false);
  }
}

import { CheckCircle, XCircle, ShieldAlert, Clock, type LucideIcon } from 'lucide-react';
import type { UpaTaskDetail } from '../../../types/upa';

export type UpaTaskStatus = UpaTaskDetail['status'];

/** Icono de estado de una tarea UPA (FC163 F2B4 Sub-Batch 4B-2). */
export function getStatusIcon(status: UpaTaskStatus): LucideIcon {
  if (status === 'completed') return CheckCircle;
  if (status === 'DEFERRED_FINANCIAL') return XCircle;
  if (status === 'N_A_STRUCTURAL') return ShieldAlert;
  return Clock;
}

/** Etiqueta es-MX para el estado de una tarea UPA. Exportada para test directo (FC164 Cond.R4-164). */
export function getStatusLabel(status: UpaTaskStatus): string {
  if (status === 'completed') return 'Completada';
  if (status === 'DEFERRED_FINANCIAL') return 'Dif. Financiero';
  if (status === 'N_A_STRUCTURAL') return 'No Aplica';
  return 'Pendiente';
}

/** Clase de descripción según estado (tachada si completada) (FC163 F2B4 Sub-Batch 4B-2). */
export function getDescriptionCls(status: UpaTaskStatus): string {
  if (status === 'completed') return 'line-through text-[#0f2a44]/40';
  if (status !== 'pending') return 'text-[#0f2a44]/50';
  return 'text-[#0f2a44]';
}

/** Clase de badge de estado de una tarea UPA (FC163 F2B4 Sub-Batch 4B-2). */
export function getBadgeCls(status: UpaTaskStatus): string {
  if (status === 'completed') return 'text-emerald-700 bg-emerald-50';
  if (status === 'DEFERRED_FINANCIAL') return 'text-red-600 bg-red-50';
  return 'text-amber-700 bg-amber-50';
}

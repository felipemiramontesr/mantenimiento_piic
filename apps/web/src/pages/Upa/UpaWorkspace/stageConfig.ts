import { Search, Wrench, Layers, Clock, CheckSquare, type LucideIcon } from 'lucide-react';
import type { UpaWorkOrderDetail, UpaTaskStage } from '../../../types/upa';

export const STAGE_ICONS: Record<UpaTaskStage, LucideIcon> = {
  triage: Search,
  minor_service: Wrench,
  cascade: Layers,
  deferred: Clock,
  closure: CheckSquare,
};

export const STAGE_LABELS: Record<UpaTaskStage, string> = {
  triage: 'Triaje',
  minor_service: 'Servicio Menor',
  cascade: 'Cascada',
  deferred: 'Diferidos',
  closure: 'Cierre',
};

export const STAGE_STEP: Record<UpaTaskStage, number> = {
  triage: 1,
  minor_service: 2,
  cascade: 3,
  deferred: 4,
  closure: 6,
};

export const STAGE_ORDER: UpaTaskStage[] = [
  'triage',
  'minor_service',
  'cascade',
  'deferred',
  'closure',
];

/** Calcula el paso actual del stepper (1-6) según estado y tareas pendientes (FC163 F2B4 Sub-Batch 4B-2). */
export function computeStep(wo: UpaWorkOrderDetail): number {
  if (wo.status === 'CLOSED') return 6;
  if (wo.status === 'AWAITING_AUTH') return 5;
  const found = STAGE_ORDER.find((stage) =>
    wo.tasks.some((t) => t.stage === stage && t.status === 'pending')
  );
  return found !== undefined ? STAGE_STEP[found] : 6;
}

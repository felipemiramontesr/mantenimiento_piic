import React from 'react';
import { ClipboardCheck, Wrench, ListTree, Clock, CheckCircle } from 'lucide-react';
import { UpaPackageLevel, UpaTaskStage } from '../../../types/maintenance';

/** Etiqueta y estilo del badge de tipo de servicio UPA según el nivel de cascada. */
export const getUpaBadgeInfo = (
  isMine: boolean,
  level: UpaPackageLevel | null
): { label: string; style: string } => {
  if (isMine)
    return {
      label: 'Servicio Menor',
      style: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    };
  if (level === '50k')
    return {
      label: 'Avanzado 50,000 km',
      style: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    };
  if (level === '30k')
    return {
      label: 'Mayor 30,000 km',
      style: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
    };
  if (level === '20k')
    return {
      label: 'Intermedio 20,000 km',
      style: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    };
  if (level === '10k')
    return { label: 'Básico 10,000 km', style: 'bg-sky-500/10 text-sky-700 border-sky-500/20' };
  return {
    label: 'Triaje + Menor (Sin Cascada)',
    style: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  };
};

export const UPA_STAGE_ORDER: UpaTaskStage[] = [
  'triage',
  'minor_service',
  'cascade',
  'deferred',
  'closure',
];

export const UPA_STAGE_LABELS: Record<UpaTaskStage, string> = {
  triage: 'Triaje',
  minor_service: 'Servicio Menor',
  cascade: 'Cascada',
  deferred: 'Diferidos',
  closure: 'Cierre',
};

export const UPA_STAGE_ICONS: Record<UpaTaskStage, React.ElementType> = {
  triage: ClipboardCheck,
  minor_service: Wrench,
  cascade: ListTree,
  deferred: Clock,
  closure: CheckCircle,
};

/** Clase del botón de envío según el modo (Taller vs In Situ). */
export const getSubmitBtnClass = (inProgress: boolean): string =>
  inProgress ? 'bg-[#0f2a44] hover:bg-[#1a3d5c] text-white' : 'btn-sentinel-emerald';

/** Texto del botón de envío según el modo y si está en curso el submit. */
export const getSubmitLabel = (inProgress: boolean, isSubmitting: boolean): string => {
  if (isSubmitting) return 'Procesando...';
  return inProgress ? 'Registrar en Taller' : 'Asentar Servicio';
};

export const inputClass =
  'w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none';

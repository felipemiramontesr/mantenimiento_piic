import { ServiceType, ServiceMode } from '../../../types/maintenance';
import { SelectOption } from '../../ArchonSelect';

export const SERVICE_LABELS: Record<ServiceType, string> = {
  BASIC_10K: 'Básico 10,000 km',
  INTERMEDIATE_20K: 'Intermedio 20,000 km',
  MAJOR_30K: 'Mayor 30,000 km',
  ADVANCED_50K: 'Avanzado 50,000 km',
  MINOR_MINING: 'Servicio Menor',
};

export const SERVICE_MODE_LABELS: Record<ServiceMode, string> = {
  FULL_COMPLIANCE: 'Cumplimiento Total',
  PARTIAL_EXECUTION: 'Ejecución Parcial',
  IN_SITU: 'In Situ',
  WORKSHOP: 'Taller',
};

export const statusOptions: SelectOption[] = [
  { value: 'PASS', label: 'Correcto' },
  { value: 'REPLACED', label: 'Reemplazado' },
  { value: 'FAIL', label: 'Falla / Revisión' },
  { value: 'N_A', label: 'No Aplica' },
  { value: 'DEFERRED', label: 'Diferido — Próxima Orden' },
];

export const inputClass =
  'w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none';

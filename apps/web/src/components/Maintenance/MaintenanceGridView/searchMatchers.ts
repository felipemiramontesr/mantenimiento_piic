import { MaintenanceLog } from '../../../types/maintenance';

/** Busca `query` en unidad, técnico o tipo de servicio; retorna el campo/valor que matcheó. */
export const matchFieldInMaintenance = (
  log: MaintenanceLog,
  query: string
): { label: string; value: string } | null => {
  if (log.unit_id.toLowerCase().includes(query)) {
    return { label: 'Unidad', value: log.unit_id };
  }
  if (log.technician.toLowerCase().includes(query)) {
    return { label: 'Técnico', value: log.technician };
  }
  if (log.service_type.toLowerCase().includes(query)) {
    return {
      label: 'Tipo',
      value: log.service_type === 'MINOR_MINING' ? 'Servicio Menor' : 'Preventivo',
    };
  }
  return null;
};

export default matchFieldInMaintenance;

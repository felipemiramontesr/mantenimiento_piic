import React from 'react';
import { MaintenanceLog } from '../../../types/maintenance';
import AT from '../../../styles/archonTypography';

interface ServiceTypeCellProps {
  log: MaintenanceLog;
}

/** Celda de tipo de servicio: badge "Servicio Menor" vs "Preventivo" (FC165 F2 Slice 2.1B). */
function ServiceTypeCell({ log }: ServiceTypeCellProps): React.JSX.Element {
  return (
    <td className="py-4 px-3 text-center">
      {log.service_type === 'MINOR_MINING' ? (
        <span
          className={`${AT.statusBadge} bg-emerald-500/10 text-emerald-700 border-emerald-500/20`}
        >
          Servicio Menor
        </span>
      ) : (
        <span
          className={`${AT.statusBadge} bg-pinnacle-navy/10 text-pinnacle-navy border-pinnacle-navy/20`}
        >
          Preventivo
        </span>
      )}
    </td>
  );
}

export default ServiceTypeCell;

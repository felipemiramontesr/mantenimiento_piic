import React from 'react';
import { MaintenanceLog } from '../../../types/maintenance';
import AT from '../../../styles/archonTypography';

/** Celda de odómetro de entrada al taller (FC165 F2 Slice 2.1B). */
export function OdometerCell({ log }: { log: MaintenanceLog }): React.JSX.Element {
  return (
    <td className={`py-4 px-3 text-center ${AT.cellMono}`}>
      {Number(log.odometer_at_service).toLocaleString()} km
    </td>
  );
}

/** Celda de costo final del servicio, formateada como moneda MXN (FC165 F2 Slice 2.1B). */
export function CostCell({ log }: { log: MaintenanceLog }): React.JSX.Element {
  return (
    <td className={`py-4 px-3 text-center ${AT.cellMono} text-emerald-700`}>
      {`$${Number(log.cost).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`}
    </td>
  );
}

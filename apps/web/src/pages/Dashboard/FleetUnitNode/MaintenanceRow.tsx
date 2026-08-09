import React from 'react';
import AT from '../../../styles/archonTypography';
import { formatDate, formatKm, formatMXN } from '../nodes/NodeShared';
import { MaintenanceRecord } from './types';

const SERVICE_TYPE_LABEL: Record<string, string> = {
  BASIC_10K: 'Servicio Básico 10K',
  INTERMEDIATE_20K: 'Servicio Intermedio 20K',
  MAJOR_30K: 'Servicio Mayor 30K',
  ADVANCED_50K: 'Servicio Avanzado 50K',
  MINOR_MINING: 'Servicio Menor Minero',
};

/** Table row for a single maintenance record. */
export function MaintenanceRow(r: MaintenanceRecord): React.JSX.Element {
  const isCompleted = r.status === 'COMPLETED';
  return (
    <tr key={r.uuid} className="hover:bg-slate-50/70 transition-colors">
      <td className="px-3 py-3 text-center">
        <span className={AT.cellMono}>{formatDate(r.service_date)}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={AT.cellLabel}>{SERVICE_TYPE_LABEL[r.service_type] ?? r.service_type}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={AT.cellMono}>{formatKm(r.odometer)}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={AT.cellValue}>{formatMXN(Number(r.cost))}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={AT.cellValue}>{r.technician}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <span
          className={`text-archon-xs font-black uppercase px-2 py-0.5 rounded-[3px] ${
            isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isCompleted ? 'Completado' : 'Activo'}
        </span>
      </td>
    </tr>
  );
}

export default MaintenanceRow;

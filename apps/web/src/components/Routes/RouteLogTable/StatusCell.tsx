import React from 'react';
import { RouteLogStatus } from './telemetryCalcs';

interface StatusCellProps {
  status: RouteLogStatus;
  className: string;
}

/** Celda de estado visual de la ruta (en ruta/finalizada) (FC163 F2B4 Sub-Batch 4B-2). */
function StatusCell({ status, className }: StatusCellProps): React.JSX.Element {
  return (
    <td className={`py-6 ${className}`}>
      <div className="flex justify-center">
        <span
          className={`px-3 py-1.5 rounded-[4px] text-archon-sm font-black uppercase tracking-widest border ${status.bg} ${status.color} ${status.border}`}
        >
          {status.label}
        </span>
      </div>
    </td>
  );
}

export default StatusCell;

import React from 'react';
import { User } from 'lucide-react';
import { MaintenanceLog } from '../../../types/maintenance';
import { UserIndustrial } from '../../../types/user';
import AT from '../../../styles/archonTypography';

interface TechnicianCellProps {
  log: MaintenanceLog;
  technician: UserIndustrial | undefined;
}

/** Celda de técnico asignado: avatar, nombre y número de empleado (FC165 F2 Slice 2.1B). */
function TechnicianCell({ log, technician }: TechnicianCellProps): React.JSX.Element {
  return (
    <td className="py-4 px-3 text-center">
      <div className="flex flex-col items-center">
        <div className="relative mb-2">
          <div className="w-10 h-10 rounded-full bg-[#0f2a44]/5 flex items-center justify-center border border-[#0f2a44]/10 overflow-hidden relative">
            <User size={18} className="text-[#0f2a44]" />
            {technician?.imageUrl && (
              <img
                src={technician.imageUrl}
                className="absolute inset-0 w-full h-full rounded-full object-cover"
                alt={technician.fullName || 'Técnico'}
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
                  const img = e.currentTarget;
                  img.style.display = 'none';
                }}
              />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
            <span className="text-[6px] text-white font-black">A</span>
          </div>
        </div>
        <span
          className="text-archon-base font-black text-[#0f2a44] bg-[#0f2a44]/5 px-2 py-0.5 rounded-[4px] text-center"
          title={technician?.fullName || log.technician || 'Staff No Identificado'}
        >
          {technician?.fullName || log.technician || 'Staff No Identificado'}
        </span>
        <span className={AT.cellMeta}>ID: {technician?.employeeNumber || 'TEC-000'}</span>
      </div>
    </td>
  );
}

export default TechnicianCell;

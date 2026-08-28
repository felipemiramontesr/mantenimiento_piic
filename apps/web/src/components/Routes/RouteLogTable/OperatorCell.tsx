import React from 'react';
import { User } from 'lucide-react';
import AT from '../../../styles/archonTypography';
import { UserIndustrial } from '../../../types/user';

interface OperatorCellProps {
  operator: UserIndustrial | undefined;
  className: string;
}

/** Celda de operador: avatar, nombre y número de empleado (FC163 F2B4 Sub-Batch 4B-2). */
function OperatorCell({ operator, className }: OperatorCellProps): React.JSX.Element {
  return (
    <td className={`py-4 ${className}`}>
      <div className="flex flex-col items-center">
        <div className="relative mb-2">
          <div className="w-10 h-10 rounded-full bg-[#0f2a44]/5 flex items-center justify-center border border-[#0f2a44]/10 overflow-hidden relative">
            <User size={18} className="text-[#0f2a44]" />
            {operator?.imageUrl && (
              <img
                src={operator.imageUrl}
                className="absolute inset-0 w-full h-full rounded-full object-cover"
                alt={operator.fullName || 'Operator'}
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
                  const imgElement = e.currentTarget;
                  imgElement.style.display = 'none';
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
          title={operator?.fullName || 'Staff No Identificado'}
        >
          {operator?.fullName || 'Staff No Identificado'}
        </span>
        <span className={AT.cellMeta}>ID: {operator?.employeeNumber || 'OPE-999'}</span>
      </div>
    </td>
  );
}

export default OperatorCell;

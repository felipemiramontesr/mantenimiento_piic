import React from 'react';
import { motion } from 'framer-motion';
import { MaintenanceLog } from '../../../types/maintenance';
import { useFleet } from '../../../context/FleetContext';
import { useUsers } from '../../../context/UserContext';
import UnitCell from './UnitCell';
import TechnicianCell from './TechnicianCell';
import ServiceTypeCell from './ServiceTypeCell';
import { OdometerCell, CostCell } from './OdometerAndCostCells';
import DatesCell from './DatesCell';
import ActionsCell from './ActionsCell';

function getRowClassName(isActive: boolean, isCompleted: boolean, clickable: boolean): string {
  if (isActive)
    return 'border-y border-solid transition-colors bg-amber-50/50 hover:bg-amber-50/80 border-amber-200/50';
  const cursor = isCompleted && clickable ? 'cursor-pointer' : '';
  return `border-y border-solid transition-colors bg-transparent hover:bg-pinnacle-navy/[0.015] border-slate-200/50 ${cursor}`;
}

interface MaintenanceLogRowProps {
  log: MaintenanceLog;
  index: number;
  onCompleteRequest?: (log: MaintenanceLog) => void;
  onDetailRequest?: (log: MaintenanceLog) => void;
  onAcceptOrder?: (uuid: string, logId: number) => void;
  onRejectOrder?: (uuid: string) => void;
  onOpenUpa?: (workOrderId: number) => void;
}

/** Fila del grid de mantenimiento: compone las celdas de datos + acciones (FC165 F2 Slice 2.1B). */
function MaintenanceLogRow({
  log,
  index,
  onCompleteRequest,
  onDetailRequest,
  onAcceptOrder,
  onRejectOrder,
  onOpenUpa,
}: MaintenanceLogRowProps): React.JSX.Element {
  const { units } = useFleet();
  const { users } = useUsers();

  const unit = units.find((u) => u.id === log.unit_id);
  const technician = users.find(
    (u) => u.fullName === log.technician || u.username === log.technician
  );
  const isOpen = log.movement_status === 'OPEN';
  const isActive = log.movement_status === 'ACTIVE';
  const isCompleted = log.movement_status === 'COMPLETED';
  const hasUpa = isActive && log.upa_work_order_id != null;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={isCompleted && onDetailRequest ? (): void => onDetailRequest(log) : undefined}
      className={getRowClassName(isActive, isCompleted, Boolean(onDetailRequest))}
    >
      <UnitCell log={log} unit={unit} isActive={isActive} />
      <TechnicianCell log={log} technician={technician} />
      <ServiceTypeCell log={log} />
      <OdometerCell log={log} />
      <DatesCell log={log} isActive={isActive} />
      <CostCell log={log} />
      <ActionsCell
        log={log}
        isOpen={isOpen}
        isActive={isActive}
        hasUpa={hasUpa}
        onCompleteRequest={onCompleteRequest}
        onAcceptOrder={onAcceptOrder}
        onRejectOrder={onRejectOrder}
        onOpenUpa={onOpenUpa}
      />
    </motion.tr>
  );
}

export default MaintenanceLogRow;

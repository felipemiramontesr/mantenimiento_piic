import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useFleet } from '../../../context/FleetContext';
import { useUsers } from '../../../context/UserContext';
import ForensicJournalTable from '../ForensicJournalTable';
import { RouteLog, RouteLogRowProps } from './types';
import {
  computeConsumedLiters,
  computeKmPerLiter,
  computeCostPerKm,
  getRouteLogStatus,
} from './telemetryCalcs';
import { FleetUnit } from '../../../types/fleet';
import UnitCell from './UnitCell';
import OperatorCell from './OperatorCell';
import MissionCell from './MissionCell';
import TelemetryCell from './TelemetryCell';
import FuelCell from './FuelCell';
import DeltaCell from './DeltaCell';
import { ConsumptionCell, CostCell } from './ConsumptionAndCostCells';
import StatusCell from './StatusCell';
import ActionsCell from './ActionsCell';

interface ForensicAccordionRowProps {
  unitId: string;
  routeUuid: string;
  isExpanded: boolean;
}

/** Cálculos de telemetría (litros/km/costo) memoizados por log+unidad (FC163 F2B4 Sub-Batch 4B-2). */
function useRouteTelemetry(
  log: RouteLog,
  unit: FleetUnit | undefined
): { consumedLiters: number | null; kmPerLiter: number | null; costPerKm: number | null } {
  const consumedLiters = useMemo(() => computeConsumedLiters(log, unit), [log, unit]);
  const kmPerLiter = useMemo(() => computeKmPerLiter(log, consumedLiters), [log, consumedLiters]);
  const costPerKm = useMemo(() => computeCostPerKm(log), [log]);
  return { consumedLiters, kmPerLiter, costPerKm };
}

/** Fila expandible con el diario forense de la unidad/ruta (FC163 F2B4 Sub-Batch 4B-2). */
function ForensicAccordionRow({
  unitId,
  routeUuid,
  isExpanded,
}: ForensicAccordionRowProps): React.JSX.Element {
  return (
    <tr className={isExpanded ? 'accordion-row-carrier' : ''}>
      <td
        colSpan={10}
        className={`accordion-carrier !p-0 !m-0 ${isExpanded ? 'expanded-accordion-carrier' : ''}`}
      >
        <div className={`accordion-content ${isExpanded ? 'expanded' : ''} !bg-transparent`}>
          <div className="accordion-inner !p-0 !m-0">
            {isExpanded && (
              <ForensicJournalTable unitId={unitId} routeUuid={routeUuid} hideHeader />
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

interface RouteLogDataRowProps {
  log: RouteLog;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: (l: RouteLog) => void;
  onReport: (l: RouteLog) => void;
  onFinish: (l: RouteLog) => void;
  operator: ReturnType<typeof useUsers>['users'][number] | undefined;
  unit: FleetUnit | undefined;
  sede: string;
  status: ReturnType<typeof getRouteLogStatus>;
  consumedLiters: number | null;
  kmPerLiter: number | null;
  costPerKm: number | null;
}

/** Fila de tabla con las celdas de datos de un log de ruta (FC163 F2B4 Sub-Batch 4B-2). */
function RouteLogDataRow({
  log,
  index,
  isExpanded,
  onToggle,
  onEdit,
  onReport,
  onFinish,
  operator,
  unit,
  sede,
  status,
  consumedLiters,
  kmPerLiter,
  costPerKm,
}: RouteLogDataRowProps): React.JSX.Element {
  const borderTopClass = isExpanded ? 'expanded-row-cell' : '';
  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onToggle}
      className={`${isExpanded ? 'expanded-focus-sovereign' : ''} ${
        log.incident_count && log.incident_count > 0 ? 'route-incident-row' : ''
      } bg-transparent border-y border-solid border-slate-200/50 hover:bg-slate-50/50 transition-all duration-300 cursor-pointer`}
    >
      <UnitCell log={log} unit={unit} className={borderTopClass} />
      <OperatorCell operator={operator} className={borderTopClass} />
      <MissionCell log={log} sede={sede} className={borderTopClass} />
      <TelemetryCell log={log} className={borderTopClass} />
      <FuelCell log={log} unit={unit} className={borderTopClass} />
      <DeltaCell log={log} className={borderTopClass} />
      <ConsumptionCell
        consumedLiters={consumedLiters}
        kmPerLiter={kmPerLiter}
        className={borderTopClass}
      />
      <CostCell log={log} costPerKm={costPerKm} className={borderTopClass} />
      <StatusCell status={status} className={borderTopClass} />
      <ActionsCell
        log={log}
        className={borderTopClass}
        onEdit={onEdit}
        onReport={onReport}
        onFinish={onFinish}
      />
    </motion.tr>
  );
}

/** Fila de log de ruta: celdas de datos + fila expandible de diario forense (FC163 F2B4 Sub-Batch 4B-2). */
const RouteLogRow = ({
  log,
  index,
  isExpanded,
  onToggle,
  onEdit,
  onReport,
  onFinish,
}: RouteLogRowProps): React.JSX.Element => {
  const { users } = useUsers();
  const { units } = useFleet();

  const operator = users.find((u) => u.id === String(log.operator_id));
  const unit = units.find((u) => u.id === log.unit_id);

  const { consumedLiters, kmPerLiter, costPerKm } = useRouteTelemetry(log, unit);
  const status = getRouteLogStatus(log);
  const sede = unit?.sede || 'BASE';

  return (
    <>
      <RouteLogDataRow
        log={log}
        index={index}
        isExpanded={isExpanded}
        onToggle={onToggle}
        onEdit={onEdit}
        onReport={onReport}
        onFinish={onFinish}
        operator={operator}
        unit={unit}
        sede={sede}
        status={status}
        consumedLiters={consumedLiters}
        kmPerLiter={kmPerLiter}
        costPerKm={costPerKm}
      />
      <ForensicAccordionRow unitId={log.unit_id} routeUuid={log.uuid} isExpanded={isExpanded} />
    </>
  );
};

export default RouteLogRow;

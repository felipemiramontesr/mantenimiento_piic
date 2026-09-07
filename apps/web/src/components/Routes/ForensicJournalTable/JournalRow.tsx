import React from 'react';
import { formatDateTime } from '../../../utils/dateUtils';
import { FleetUnit } from '../../../types/fleet';
import AT from '../../../styles/archonTypography';
import { ActivityLog } from './types';
import { getEventStyle } from './eventStyle';
import DescriptionCell from './DescriptionCell';
import ImpactCell from './ImpactCell';

interface ActivoCellProps {
  readonly log: ActivityLog;
}

/** Celda "ACTIVO" (unidad + marca/modelo) — solo cuando no hay `unitId` fijo. */
function ActivoCell({ log }: ActivoCellProps): React.JSX.Element {
  return (
    <td className="py-4 text-center">
      <div className="flex flex-col items-center justify-center">
        <span className={`${AT.cellValue} bg-pinnacle-navy/5 px-2 py-0.5 rounded-[4px]`}>
          {log.unit_id}
        </span>
        <span className="text-archon-sm font-bold opacity-40 uppercase">
          {log.marca} {log.modelo}
        </span>
      </div>
    </td>
  );
}

interface EventoCellProps {
  readonly eventType: string;
}

/** Celda "EVENTO / IMPACTO" (ícono + label del tipo de evento). */
function EventoCell({ eventType }: EventoCellProps): React.JSX.Element {
  const style = getEventStyle(eventType);
  const EventIcon = style.icon;
  return (
    <td className="py-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <div className={`p-1.5 rounded-[4px] ${style.bg}`}>
          <EventIcon size={12} className={style.color} />
        </div>
        <span className={`text-archon-base font-black uppercase tracking-widest ${style.color}`}>
          {style.label}
        </span>
      </div>
    </td>
  );
}

export interface JournalRowProps {
  readonly log: ActivityLog;
  readonly unitId: string | undefined;
  readonly units: FleetUnit[];
  readonly sessionEvidence: Map<string, { maxObserved: number }>;
}

/** Una fila `<tr>` del Journal Forense — extraída de
 * `ForensicJournalTable`'s `renderRow` para mantenerlo bajo el presupuesto
 * de Gate2 (FC165 F3 Slice3.1 Batch4, Dual-Gate Isolation). */
export default function JournalRow({
  log,
  unitId,
  units,
  sessionEvidence,
}: JournalRowProps): React.JSX.Element {
  const isIncident = log.event_type === 'ROUTE_INCIDENT' || log.event_type === 'ADMIN_EDIT';

  return (
    <tr key={log.id} className={isIncident ? 'forensic-incident-row' : ''}>
      <td className="py-4 text-center">
        <span className={AT.cellValue}>{formatDateTime(log.created_at)}</span>
      </td>

      <td className="py-4 text-center">
        <span className="text-archon-sm font-black text-pinnacle-navy bg-pinnacle-navy/5 px-1.5 py-0.5 rounded border border-pinnacle-navy/10 uppercase tracking-tighter">
          {String(log.id).substring(0, 8)}
        </span>
      </td>

      {!unitId && <ActivoCell log={log} />}

      <EventoCell eventType={log.event_type} />

      <td className="py-4 px-4 text-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <DescriptionCell
            log={log}
            units={units}
            sessionEvidence={sessionEvidence}
            isIncident={isIncident}
          />
        </div>
      </td>

      <td className="py-4 text-center">
        <ImpactCell log={log} />
      </td>

      <td className="py-4 text-center">
        <div className="text-center">
          <p className={AT.cellValue}>{log.operatorName}</p>
          <p className="text-archon-sm font-bold opacity-40 uppercase tracking-tighter">
            Certified Audit
          </p>
        </div>
      </td>
    </tr>
  );
}

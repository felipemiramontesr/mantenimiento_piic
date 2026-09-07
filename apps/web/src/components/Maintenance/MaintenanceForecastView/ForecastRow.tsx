import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, CalendarPlus, Gauge, Zap } from 'lucide-react';
import { MaintenanceForecastRow } from '../../../types/maintenance';
import { FleetUnit } from '../../../types/fleet';
import AT from '../../../styles/archonTypography';
import {
  SERVICE_BADGE,
  SERVICE_LABELS,
  FALLBACK_BADGE,
  URGENCY_META,
  fallbackUrgencyMeta,
} from './constants';
import { kmRemainingColor, formatDate, daysColor } from './helpers';

interface UnitCellProps {
  readonly row: MaintenanceForecastRow;
  readonly unit: FleetUnit | undefined;
}

/** Celda UNIDAD (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function UnitCell({ row, unit }: UnitCellProps): React.JSX.Element {
  return (
    <td className="py-4 px-3 text-center">
      <div className="flex flex-col items-center">
        {unit?.images?.[0] ? (
          <img
            src={unit.images[0]}
            className="w-20 h-20 block mx-auto rounded-[4px] shadow-sm object-cover mb-2"
            alt={row.unitId}
            onError={({ currentTarget }): void => {
              currentTarget.setAttribute('src', '/img/archon-unit-default.png');
            }}
          />
        ) : (
          <div className="w-20 h-20 mx-auto rounded-[4px] bg-slate-50 flex items-center justify-center border border-dashed border-slate-200 mb-2 overflow-hidden">
            <img
              src="/img/archon-unit-default.png"
              alt="Unidad Archon sin imagen"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <span className="text-archon-base font-black text-[#0f2a44] bg-[#0f2a44]/5 px-2 py-0.5 rounded-[4px]">
          {row.unitId}
        </span>
        <span className={AT.cellMeta}>
          {row.marca} {row.modelo}
        </span>
      </div>
    </td>
  );
}

/** Celdas ODÓMETRO/KM RESTANTES/PRÓX. SERVICIO/TIPO PROYECTADO
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function TelemetryCells({ row }: { readonly row: MaintenanceForecastRow }): React.JSX.Element {
  const svcBadge = SERVICE_BADGE[row.projectedServiceType] ?? FALLBACK_BADGE;
  return (
    <>
      <td className={`py-4 px-3 text-center ${AT.cellMono}`}>
        <div className="flex items-center justify-center gap-1.5">
          <Gauge size={11} className="text-[#0f2a44]/30 shrink-0" />
          {row.currentOdometer.toLocaleString()} km
        </div>
        <p className={AT.cellMeta}>{row.dailyUsageAvg.toLocaleString()} km/día</p>
      </td>
      <td className="py-4 px-3 text-center">
        <span className={`font-mono text-archon-lg font-bold ${kmRemainingColor(row.kmRemaining)}`}>
          {row.kmRemaining.toLocaleString()} km
        </span>
        <p className={AT.cellMeta}>umbral: {row.nextKmReading.toLocaleString()} km</p>
      </td>
      <td className="py-4 px-3 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <Calendar size={11} className="text-[#0f2a44]/30 shrink-0" />
          <span className={AT.cellValue}>{formatDate(row.nextServiceDate)}</span>
        </div>
        <p className={`${AT.cellMeta} ${daysColor(row.daysUntilService)}`}>
          {row.daysUntilService} día{row.daysUntilService !== 1 ? 's' : ''}
        </p>
      </td>
      <td className="py-4 px-3 text-center">
        <span className={`${AT.statusBadge} ${svcBadge.bg} ${svcBadge.text} ${svcBadge.border}`}>
          {SERVICE_LABELS[row.projectedServiceType] ?? row.projectedServiceType}
        </span>
        <p className={AT.cellMeta}>odo: {row.projectedOdometer.toLocaleString()} km</p>
      </td>
    </>
  );
}

/** Celda URGENCIA (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function UrgencyCell({ row }: { readonly row: MaintenanceForecastRow }): React.JSX.Element {
  const urgMeta = URGENCY_META[row.urgency] ?? fallbackUrgencyMeta(row.urgency);
  return (
    <td className="py-4 px-3 text-center">
      <span className={`${AT.statusBadge} ${urgMeta.bg} ${urgMeta.text} ${urgMeta.border}`}>
        {urgMeta.icon}
        {urgMeta.label}
      </span>
      <div className="flex items-center justify-center gap-1 mt-1">
        <Zap size={8} className="text-[#0f2a44]/30 shrink-0" />
        <span className={AT.cellMeta}>{row.triggerType === 'KM' ? 'Kilometraje' : 'Fecha'}</span>
      </div>
    </td>
  );
}

interface ScheduleActionCellProps {
  readonly unitId: string;
  readonly onScheduleRequest: (unitId: string) => void;
}

/** Celda ACCIONES — botón de programar servicio (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function ScheduleActionCell({
  unitId,
  onScheduleRequest,
}: ScheduleActionCellProps): React.JSX.Element {
  return (
    <td className="py-4 px-3 text-center">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={(): void => onScheduleRequest(unitId)}
          title="Programar Servicio"
          className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none group"
        >
          <CalendarPlus
            size={18}
            className="transition-transform duration-300 group-hover:rotate-12"
          />
        </button>
      </div>
    </td>
  );
}

export interface ForecastRowProps {
  readonly row: MaintenanceForecastRow;
  readonly index: number;
  readonly unit: FleetUnit | undefined;
  readonly onScheduleRequest: (unitId: string) => void;
}

/** Fila de la tabla de pronóstico (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
export function ForecastRow({
  row,
  index,
  unit,
  onScheduleRequest,
}: ForecastRowProps): React.JSX.Element {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="border-y border-solid border-slate-200/50 bg-transparent hover:bg-pinnacle-navy/[0.015] transition-colors duration-300"
    >
      <UnitCell row={row} unit={unit} />
      <td className="py-4 px-3 text-center">
        <span className={`${AT.statusBadge} bg-[#0f2a44]/5 text-[#0f2a44] border-[#0f2a44]/10`}>
          {row.departamento}
        </span>
      </td>
      <TelemetryCells row={row} />
      <UrgencyCell row={row} />
      <ScheduleActionCell unitId={row.unitId} onScheduleRequest={onScheduleRequest} />
    </motion.tr>
  );
}

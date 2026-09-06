import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { FleetUnit } from '../../../types/fleet';
import { ActivityLog } from './types';
import {
  normalizeId,
  buildUnitLookup,
  detectFuelAnomaly,
  resolveDisplayDescription,
} from './anomalyDetection';

export interface DescriptionCellProps {
  log: ActivityLog;
  units: FleetUnit[];
  sessionEvidence: Map<string, { maxObserved: number }>;
  isIncident: boolean;
}

/** Celda de descripción: resuelve la unidad, detecta anomalías de consumo
 * de combustible, y renderiza el banner de alerta + texto normalizado —
 * extraída de `ForensicJournalTable`'s `renderRow` para mantenerlo bajo el
 * presupuesto de Gate2 (FC165 F3 Slice3.1 Batch4, Dual-Gate Isolation). */
export default function DescriptionCell({
  log,
  units,
  sessionEvidence,
  isIncident,
}: DescriptionCellProps): React.JSX.Element {
  // 🔱 Resolución del Activo y Contexto de Sesión
  const unitMap = buildUnitLookup(units);
  const logUnitId = normalizeId(log.unit_id);
  const unit = unitMap.get(logUnitId);

  // 🧠 FASE 2: Validación con Evidencia de Sesión (Vector F)
  const evidence = sessionEvidence.get(logUnitId);
  const observedMax = evidence?.maxObserved || 0;

  const isAnomalous = detectFuelAnomaly(log, unit, observedMax);
  const displayDesc = resolveDisplayDescription(log);

  return (
    <>
      {isAnomalous && (
        <div className="w-full px-2 py-1.5 bg-rose-600 rounded-[2px] border border-rose-700 shadow-md animate-pulse mb-1">
          <div className="flex items-center gap-1.5 justify-center">
            <AlertTriangle size={11} className="text-white" />
            <span className="text-[8.5px] font-black text-white uppercase tracking-tighter leading-none text-center">
              Posible desviación de consumo o robo de combustible
            </span>
          </div>
        </div>
      )}
      <p
        className={`text-archon-base font-bold leading-tight text-center w-full text-pinnacle-navy ${
          isIncident ? 'not-italic px-3 py-1' : 'opacity-70 italic'
        } ${
          isAnomalous
            ? 'text-rose-700 bg-rose-50/70 rounded p-1.5 border-2 border-rose-200 shadow-inner'
            : ''
        }`}
      >
        {displayDesc}
      </p>
    </>
  );
}

import React from 'react';
import { Activity, ArrowRight, Fuel, Shield } from 'lucide-react';
import { ActivityLog } from './types';
import UniversalDeltaEngine from './UniversalDeltaEngine';

interface ReadingImpactRowProps {
  log: ActivityLog;
}

/** 🚗 READING IMPACT (KM/HRS). */
function ReadingImpactRow({ log }: ReadingImpactRowProps): React.ReactNode {
  if (
    log.reading_before === null ||
    log.reading_after === null ||
    Number(log.reading_before) === Number(log.reading_after)
  ) {
    return null;
  }
  const delta = log.reading_after ? log.reading_after - log.reading_before : 0;
  return (
    <div className="flex items-center gap-2 bg-pinnacle-navy/5 px-2 py-1 rounded-[4px]">
      <Activity size={10} className="text-pinnacle-navy opacity-50" />
      <span className="text-archon-base font-black text-pinnacle-navy">
        {log.reading_before?.toLocaleString()}
      </span>
      <ArrowRight size={10} className="opacity-30" />
      <span className="text-archon-base font-black text-pinnacle-navy">
        {log.reading_after?.toLocaleString()}
      </span>
      <span className="text-archon-sm font-bold text-emerald-600 bg-emerald-50 px-1 rounded-sm">
        {delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()} KM
      </span>
    </div>
  );
}

/** ⛽ FUEL IMPACT (Liters). */
function FuelLitersImpactRow({ log }: ReadingImpactRowProps): React.ReactNode {
  if (
    log.fuel_before === null ||
    log.fuel_after === null ||
    Number(log.fuel_before) === Number(log.fuel_after)
  ) {
    return null;
  }
  return (
    <div className="flex items-center gap-2 bg-amber-50/50 border border-amber-100 px-2 py-1 rounded-[4px]">
      <Fuel size={10} className="text-amber-600" />
      <span className="text-archon-base font-black text-pinnacle-navy">
        {Number(log.fuel_before).toFixed(1)} L
      </span>
      <ArrowRight size={10} className="opacity-30" />
      <span className="text-archon-base font-black text-pinnacle-navy">
        {Number(log.fuel_after).toFixed(1)} L
      </span>
    </div>
  );
}

/** ⛽ FUEL IMPACT (Percentage Level). */
function FuelLevelImpactRow({ log }: ReadingImpactRowProps): React.ReactNode {
  if (
    log.fuel_level_before === null ||
    log.fuel_level_after === null ||
    Number(log.fuel_level_before) === Number(log.fuel_level_after)
  ) {
    return null;
  }
  return (
    <div className="flex items-center gap-2 bg-amber-50/50 border border-amber-100 px-2 py-1 rounded-[4px]">
      <Fuel size={10} className="text-amber-600" />
      <span className="text-archon-base font-black text-pinnacle-navy">
        {Number(log.fuel_level_before).toFixed(0)}%
      </span>
      <ArrowRight size={10} className="opacity-30" />
      <span className="text-archon-base font-black text-pinnacle-navy">
        {Number(log.fuel_level_after).toFixed(0)}%
      </span>
    </div>
  );
}

/** 💰 FINANCIAL IMPACT (Cost). */
function FuelAmountImpactRow({ log }: ReadingImpactRowProps): React.ReactNode {
  if (
    log.fuel_amount_before === null ||
    log.fuel_amount_after === null ||
    Number(log.fuel_amount_before) === Number(log.fuel_amount_after)
  ) {
    return null;
  }
  return (
    <div className="flex items-center gap-2 bg-emerald-50/50 border border-emerald-100 px-2 py-1 rounded-[4px]">
      <span className="text-archon-base font-black text-emerald-600">$</span>
      <span className="text-archon-base font-black text-pinnacle-navy">
        {Number(log.fuel_amount_before).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
      <ArrowRight size={10} className="opacity-30" />
      <span className="text-archon-base font-black text-emerald-600">$</span>
      <span className="text-archon-base font-black text-pinnacle-navy">
        {Number(log.fuel_amount_after).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}

/** 🛡️ STATUS IMPACT. */
function StatusImpactRow({ log }: ReadingImpactRowProps): React.ReactNode {
  if (!(log.status_before !== log.status_after && log.status_before && log.status_after)) {
    return null;
  }
  return (
    <div className="flex items-center gap-2 bg-pinnacle-navy/5 px-2 py-1 rounded-[4px]">
      <Shield size={10} className="text-pinnacle-navy opacity-50" />
      <span className="text-archon-base font-black text-pinnacle-navy opacity-40">
        {log.status_before}
      </span>
      <ArrowRight size={10} className="opacity-30" />
      <span className="text-archon-base font-black text-pinnacle-navy">{log.status_after}</span>
    </div>
  );
}

function hasNoImpact(log: ActivityLog): boolean {
  return (
    (!log.reading_before || Number(log.reading_before) === Number(log.reading_after)) &&
    (!log.fuel_before || Number(log.fuel_before) === Number(log.fuel_after)) &&
    (!log.fuel_level_before || Number(log.fuel_level_before) === Number(log.fuel_level_after)) &&
    (!log.fuel_amount_before || Number(log.fuel_amount_before) === Number(log.fuel_amount_after)) &&
    (!log.status_before || log.status_before === log.status_after)
  );
}

export interface ImpactCellProps {
  log: ActivityLog;
}

/** Columna "MODIFICACIÓN": una fila por cada tipo de impacto detectado
 * (lectura/combustible/nivel/costo/estado/delta universal), o "—" si
 * ninguno aplica — extraída de `ForensicJournalTable`'s `renderRow` para
 * mantenerlo bajo el presupuesto de Gate2 (FC165 F3 Slice3.1 Batch4,
 * Dual-Gate Isolation). */
export default function ImpactCell({ log }: ImpactCellProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5">
      <ReadingImpactRow log={log} />
      <FuelLitersImpactRow log={log} />
      <FuelLevelImpactRow log={log} />
      <FuelAmountImpactRow log={log} />
      <UniversalDeltaEngine
        snapshotBefore={log.snapshot_before}
        snapshotAfter={log.snapshot_after}
      />
      <StatusImpactRow log={log} />
      {hasNoImpact(log) && (
        <span className="text-archon-base font-black text-pinnacle-navy opacity-20">—</span>
      )}
    </div>
  );
}

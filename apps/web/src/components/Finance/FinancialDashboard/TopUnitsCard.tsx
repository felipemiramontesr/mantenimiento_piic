import React from 'react';
import { DateRange, TopUnit } from '../../../types/finance';
import { formatMXN, periodLabel } from './helpers';

export interface TopUnitsCardProps {
  topUnits: TopUnit[];
  totalEgresos: number;
  dateRange: DateRange;
}

/** Tarjeta de las 5 unidades con mayor costo en el período (FC163 F2B3, split). */
export const TopUnitsCard: React.FC<TopUnitsCardProps> = ({
  topUnits,
  totalEgresos,
  dateRange,
}) => {
  if (topUnits.length === 0) return null;

  return (
    <div className="card-archon-sovereign">
      <p className="text-archon-base font-black uppercase tracking-[0.2em] text-pinnacle-navy/50 mb-4">
        Top 5 unidades por costo — {periodLabel(dateRange.from)}
        {dateRange.from !== dateRange.to ? ` — ${periodLabel(dateRange.to)}` : ''}
      </p>
      <div className="space-y-2">
        {topUnits.map((u, idx) => {
          const pct = totalEgresos > 0 ? (u.amount / totalEgresos) * 100 : 0;
          return (
            <div key={u.unitId} className="flex items-center gap-3">
              <span className="text-archon-base font-mono font-bold text-pinnacle-navy/40 w-4">
                {idx + 1}
              </span>
              <span className="text-archon-md font-black text-pinnacle-navy font-mono w-20 shrink-0">
                {u.unitId}
              </span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pinnacle-navy/70 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-archon-md font-black text-pinnacle-navy w-28 text-right shrink-0">
                {formatMXN(u.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

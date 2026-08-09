import React from 'react';
import { BarChart2 } from 'lucide-react';
import AT from '../../../styles/archonTypography';
import { useEconomicLife } from '../../../hooks/useEconomicLife';
import { InfoRow, SectionCard, formatMXN, formatPct } from '../nodes/NodeShared';

const RECOMMENDATION_BADGE: Record<string, string> = {
  KEEP: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  EVALUATE: 'bg-amber-100 text-amber-700 border border-amber-200',
  REPLACE: 'bg-red-100 text-red-700 border border-red-200',
};

const RECOMMENDATION_LABEL: Record<string, string> = {
  KEEP: 'Conservar',
  EVALUATE: 'Evaluar',
  REPLACE: 'Reemplazar',
};

/** Economic-life / replacement-recommendation card for a fleet unit. */
export function EconomicLifeSection({ unitId }: { unitId: string }): React.JSX.Element {
  const { data, loading } = useEconomicLife(unitId);
  return (
    <SectionCard title="Vida Económica" icon={<BarChart2 size={16} className="text-[#f2b705]" />}>
      {loading ? (
        <p className={`${AT.sectionDescription} text-center py-2`}>Calculando…</p>
      ) : (
        <>
          <InfoRow
            label="Recomendación"
            value={
              data?.recommendation ? (
                <span
                  className={`text-archon-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] ${
                    RECOMMENDATION_BADGE[data.recommendation] ?? ''
                  }`}
                >
                  {RECOMMENDATION_LABEL[data.recommendation] ?? data.recommendation}
                </span>
              ) : null
            }
          />
          <InfoRow label="Valor residual estimado" value={formatMXN(data?.residual_value_mxn)} />
          <InfoRow label="TCO acumulado" value={formatMXN(data?.accumulated_tco)} />
          <InfoRow
            label="Score de reemplazo"
            value={
              data?.replacement_score != null ? formatPct(data.replacement_score * 100, 0) : null
            }
          />
        </>
      )}
    </SectionCard>
  );
}

export default EconomicLifeSection;

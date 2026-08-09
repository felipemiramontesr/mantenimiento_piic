import React from 'react';
import { User } from 'lucide-react';
import AT from '../../../styles/archonTypography';
import { useOperatorScorecard } from '../../../hooks/useOperatorScorecard';
import { InfoRow, SectionCard, formatNum, formatPct } from '../nodes/NodeShared';

/** Operator scorecard KPIs card for a fleet unit. */
export function OperatorScorecardSection({ unitId }: { unitId: string }): React.JSX.Element {
  const { data, loading } = useOperatorScorecard(unitId);
  return (
    <SectionCard
      title="Scorecard del Operador"
      icon={<User size={16} className="text-[#f2b705]" />}
    >
      {loading ? (
        <p className={`${AT.sectionDescription} text-center py-2`}>Calculando…</p>
      ) : (
        <>
          <InfoRow
            label="ID del conductor principal"
            value={data?.driver_id != null ? String(data.driver_id) : null}
          />
          <InfoRow
            label="Rutas registradas"
            value={data?.route_count != null ? formatNum(data.route_count, 'rutas') : null}
          />
          <InfoRow
            label="Score compuesto"
            value={data?.composite_score != null ? formatPct(data.composite_score, 1) : null}
          />
          <InfoRow
            label="Eficiencia de combustible"
            value={
              data?.fuel_efficiency_score != null ? formatPct(data.fuel_efficiency_score, 1) : null
            }
          />
          <InfoRow
            label="Tasa de incidentes"
            value={
              data?.incident_rate_score != null ? formatPct(data.incident_rate_score, 1) : null
            }
          />
          <InfoRow
            label="Adherencia a checkpoints"
            value={
              data?.checkpoint_adherence_score != null
                ? formatPct(data.checkpoint_adherence_score, 1)
                : null
            }
          />
        </>
      )}
    </SectionCard>
  );
}

export default OperatorScorecardSection;

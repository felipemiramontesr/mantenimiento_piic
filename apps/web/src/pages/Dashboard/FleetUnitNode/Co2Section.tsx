import React from 'react';
import { Leaf } from 'lucide-react';
import AT from '../../../styles/archonTypography';
import { useCo2 } from '../../../hooks/useCo2';
import { InfoRow, SectionCard, formatNum } from '../nodes/NodeShared';

/** CO2/ESG footprint card for a fleet unit. */
export function Co2Section({ unitId }: { unitId: string }): React.JSX.Element {
  const { data, loading } = useCo2(unitId);
  const period =
    data?.period_from && data.period_to ? `${data.period_from} — ${data.period_to}` : null;
  return (
    <SectionCard
      title="Huella de CO₂ (Scope 1 ESG)"
      icon={<Leaf size={16} className="text-[#f2b705]" />}
    >
      {loading ? (
        <p className={`${AT.sectionDescription} text-center py-2`}>Calculando…</p>
      ) : (
        <>
          <InfoRow
            label="CO₂ total acumulado"
            value={data?.total_co2_kg != null ? formatNum(data.total_co2_kg, 'kg CO₂', 1) : null}
          />
          <InfoRow
            label="Litros totales cargados"
            value={data?.total_liters != null ? formatNum(data.total_liters, 'L', 1) : null}
          />
          <InfoRow
            label="Factor de emisión"
            value={
              data?.co2_factor_kg_per_liter != null
                ? formatNum(data.co2_factor_kg_per_liter, 'kg/L', 3)
                : null
            }
          />
          <InfoRow label="Combustible" value={data?.fuel_code} />
          <InfoRow label="Período analizado" value={period} />
        </>
      )}
    </SectionCard>
  );
}

export default Co2Section;

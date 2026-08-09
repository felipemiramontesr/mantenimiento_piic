import React from 'react';
import { TrendingUp } from 'lucide-react';
import AT from '../../../styles/archonTypography';
import { useFleetIntelligence, FleetIntelligenceData } from '../../../hooks/useFleetIntelligence';
import { SectionCard, formatMXN, formatNum, formatPct } from '../nodes/NodeShared';

type IntelligenceKpi = { label: string; value: string; sub: string };

function buildIntelligenceKpis(data: FleetIntelligenceData | null): IntelligenceKpi[] {
  return [
    {
      label: 'OEE',
      value: data?.oee != null ? formatPct(data.oee, 1) : '—',
      sub: 'Efectividad del equipo',
    },
    {
      label: 'TCO/km',
      value: data?.tco_per_km != null ? formatMXN(data.tco_per_km) : '—',
      sub: 'Costo total por km',
    },
    {
      label: 'Km/L',
      value: data?.km_per_liter != null ? formatNum(data.km_per_liter, 'km/L', 1) : '—',
      sub: 'Eficiencia de combustible',
    },
    {
      label: 'Cumpl. PM',
      value: data?.pm_compliance != null ? formatPct(data.pm_compliance, 1) : '—',
      sub: 'Adherencia a mantenimiento preventivo',
    },
    {
      label: 'Edad Backlog',
      value: data?.backlog_aging_days != null ? formatNum(data.backlog_aging_days, 'días', 1) : '—',
      sub: 'Antigüedad promedio del backlog',
    },
  ];
}

/** Fleet-intelligence KPI grid for a fleet unit. */
export function IntelligenceKpiSection({ unitId }: { unitId: string }): React.JSX.Element {
  const { data, loading } = useFleetIntelligence(unitId);
  const kpis = buildIntelligenceKpis(data);

  return (
    <SectionCard
      title="Inteligencia de Flota"
      icon={<TrendingUp size={16} className="text-[#f2b705]" />}
    >
      {loading ? (
        <p className={`${AT.sectionDescription} text-center py-2`}>Calculando KPIs…</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {kpis.map(({ label, value, sub }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 bg-[#0f2a44]/3 rounded-[4px] px-4 py-3 text-center"
            >
              <span className={AT.sectionDescription}>{label}</span>
              <span className="text-archon-lg font-black text-[#0f2a44]">{value}</span>
              <span className={AT.cellDetail}>{sub}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export default IntelligenceKpiSection;

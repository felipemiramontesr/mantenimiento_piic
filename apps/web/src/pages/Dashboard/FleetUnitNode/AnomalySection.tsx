import React from 'react';
import { Zap } from 'lucide-react';
import AT from '../../../styles/archonTypography';
import { useAnomalyDetection } from '../../../hooks/useAnomalyDetection';
import { InfoRow, SectionCard, formatPct, formatNum } from '../nodes/NodeShared';

/** Anomaly-detection KPIs card for a fleet unit. */
export function AnomalySection({ unitId }: { unitId: string }): React.JSX.Element {
  const { data, loading } = useAnomalyDetection(unitId);
  return (
    <SectionCard title="Detección de Anomalías" icon={<Zap size={16} className="text-[#f2b705]" />}>
      {loading ? (
        <p className={`${AT.sectionDescription} text-center py-2`}>Calculando…</p>
      ) : (
        <>
          <InfoRow
            label="Estado"
            value={
              data?.is_anomaly != null ? (
                <span
                  className={`text-archon-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-[3px] ${
                    data.is_anomaly
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {data.is_anomaly ? 'Anomalía' : 'Normal'}
                </span>
              ) : null
            }
          />
          <InfoRow label="Algoritmo" value={data?.algorithm} />
          <InfoRow
            label="Desviación"
            value={data?.deviation_pct != null ? formatPct(data.deviation_pct, 1) : null}
          />
          <InfoRow
            label="Eficiencia de la unidad"
            value={
              data?.unit_km_per_liter != null ? formatNum(data.unit_km_per_liter, 'km/L', 2) : null
            }
          />
          <InfoRow
            label="Línea base de flota"
            value={
              data?.baseline_km_per_liter != null
                ? formatNum(data.baseline_km_per_liter, 'km/L', 2)
                : null
            }
          />
        </>
      )}
    </SectionCard>
  );
}

export default AnomalySection;

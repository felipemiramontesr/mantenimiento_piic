import React from 'react';
import { Wrench } from 'lucide-react';
import AT from '../../../styles/archonTypography';
import {
  InfoRow,
  SectionCard,
  formatDate,
  formatKm,
  formatHours,
  formatPct,
} from '../nodes/NodeShared';
import { NodeUnit } from './types';
import { KmRemainingValue } from './KmRemainingValue';

/** Maintenance intelligence card: last service, forecast, and operational KPIs. */
export function MaintenanceSection({
  unit,
  kmSinceService,
  kmRemaining,
}: {
  unit: NodeUnit;
  kmSinceService: number | null;
  kmRemaining: number | null;
}): React.JSX.Element {
  return (
    <SectionCard
      title="Inteligencia de Mantenimiento"
      icon={<Wrench size={16} className="text-[#f2b705]" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-2">
          <span className={AT.sectionTitle}>Último servicio</span>
          <InfoRow label="Fecha" value={formatDate(unit.lastServiceDate)} />
          <InfoRow label="Odómetro al servicio" value={formatKm(unit.lastServiceReading)} />
          <InfoRow label="Km desde el último" value={formatKm(kmSinceService)} />
        </div>
        <div className="flex flex-col gap-2">
          <span className={AT.sectionTitle}>Pronóstico</span>
          <InfoRow label="Próximo servicio" value={formatKm(unit.nextServiceReading)} />
          <InfoRow label="Km restantes" value={<KmRemainingValue kmRemaining={kmRemaining} />} />
          <InfoRow label="Intervalo (km)" value={formatKm(unit.maintIntervalKm)} />
          <InfoRow
            label="Intervalo (días)"
            value={unit.maintIntervalDays ? `${unit.maintIntervalDays} días` : '—'}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className={AT.sectionTitle}>Indicadores operacionales</span>
          <InfoRow label="Score de salud" value={formatPct(unit.healthScore)} />
          <InfoRow label="Disponibilidad" value={formatPct(unit.availabilityIndex)} />
          <InfoRow label="MTBF" value={formatHours(unit.mtbfHours)} />
          <InfoRow label="MTTR" value={formatHours(unit.mttrHours)} />
          <InfoRow label="Backlog" value={unit.backlogCount ?? 0} />
        </div>
      </div>
    </SectionCard>
  );
}

export default MaintenanceSection;

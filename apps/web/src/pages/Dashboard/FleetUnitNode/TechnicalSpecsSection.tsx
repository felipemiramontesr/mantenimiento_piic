import React from 'react';
import { Cog } from 'lucide-react';
import { InfoRow, SectionCard, formatNum, formatPct } from '../nodes/NodeShared';
import { NodeUnit } from './types';

/** "Especificaciones Técnicas" card — motor/combustible/tracción/transmisión/
 * llantas/uso diario/capacidad/tanque/nivel. Extraída de `FleetUnitNode.tsx`
 * (FC167 F2 Gate2); mismo JSX verbatim. */
export function TechnicalSpecsSection({ unit }: { readonly unit: NodeUnit }): React.JSX.Element {
  return (
    <SectionCard
      title="Especificaciones Técnicas"
      icon={<Cog size={16} className="text-[#f2b705]" />}
    >
      <InfoRow label="Motor" value={unit.motor} />
      <InfoRow label="Combustible" value={unit.fuelType} />
      <InfoRow label="Tracción" value={unit.traccion} />
      <InfoRow label="Transmisión" value={unit.transmision} />
      <InfoRow label="Llantas" value={unit.tireSpec} />
      <InfoRow
        label="Uso diario promedio"
        value={unit.dailyUsageAvg ? formatNum(unit.dailyUsageAvg, 'km/día', 1) : null}
      />
      <InfoRow label="Capacidad de carga" value={formatNum(unit.capacidadCarga, 'kg')} />
      <InfoRow label="Tanque de combustible" value={formatNum(unit.fuelTankCapacity, 'L')} />
      <InfoRow
        label="Nivel de combustible"
        value={unit.lastFuelLevel != null ? formatPct(unit.lastFuelLevel, 0) : null}
      />
    </SectionCard>
  );
}

export default TechnicalSpecsSection;

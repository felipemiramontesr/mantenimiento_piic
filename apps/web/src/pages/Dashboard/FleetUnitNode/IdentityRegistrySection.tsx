import React from 'react';
import { Hash } from 'lucide-react';
import { InfoRow, SectionCard, formatMXN } from '../nodes/NodeShared';
import { NodeUnit } from './types';
import { FieldVisibility } from '../../../hooks/useAssetTypeFields';

/** "Identidad & Registro" card — placas/serie/tarjeta/uso/cuenta/propietario/
 * arrendamiento. Extraída de `FleetUnitNode.tsx` (FC167 F2 Gate2 — el bump de
 * react-router v7 tocó una línea interna, trayendo la función entera bajo el
 * presupuesto Dual-Gate de 50 líneas); mismo JSX verbatim. */
export function IdentityRegistrySection({
  unit,
  assetFields,
}: {
  readonly unit: NodeUnit;
  readonly assetFields: FieldVisibility;
}): React.JSX.Element {
  return (
    <SectionCard title="Identidad & Registro" icon={<Hash size={16} className="text-[#f2b705]" />}>
      {assetFields.placa && <InfoRow label="Placas" value={unit.placas} />}
      <InfoRow label="Número de serie" value={unit.numeroSerie} />
      {assetFields.circulationCardNumber && (
        <InfoRow label="Tarjeta de circulación" value={unit.circulationCardNumber} />
      )}
      <InfoRow label="Uso operacional" value={unit.uso} />
      <InfoRow label="Cuenta contable" value={unit.accountingAccount} />
      <InfoRow label="Propietario" value={unit.owner} />
      <InfoRow
        label="Pago arrendamiento"
        value={unit.monthlyLeasePayment ? formatMXN(unit.monthlyLeasePayment) : null}
      />
    </SectionCard>
  );
}

export default IdentityRegistrySection;

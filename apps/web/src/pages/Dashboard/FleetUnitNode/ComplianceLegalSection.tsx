import React from 'react';
import { Shield } from 'lucide-react';
import { InfoRow, SectionCard, formatMXN, formatDate } from '../nodes/NodeShared';
import { NodeUnit } from './types';
import { FieldVisibility } from '../../../hooks/useAssetTypeFields';

/** "Cumplimiento & Legal" card — seguro/verificación/cumplimiento/protocolo.
 * Extraída de `FleetUnitNode.tsx` (FC167 F2 Gate2); mismo JSX verbatim. */
export function ComplianceLegalSection({
  unit,
  assetFields,
}: {
  readonly unit: NodeUnit;
  readonly assetFields: FieldVisibility;
}): React.JSX.Element {
  return (
    <SectionCard
      title="Cumplimiento & Legal"
      icon={<Shield size={16} className="text-[#f2b705]" />}
    >
      {assetFields.insuranceExpiryDate && (
        <InfoRow label="Vencimiento seguro" value={formatDate(unit.insuranceExpiryDate)} />
      )}
      {assetFields.insurancePolicyNumber && (
        <InfoRow label="Póliza de seguro" value={unit.insurancePolicyNumber} />
      )}
      <InfoRow
        label="Costo del seguro"
        value={unit.insuranceCost ? formatMXN(unit.insuranceCost) : null}
      />
      {assetFields.vencimientoVerificacion && (
        <InfoRow label="Verificación" value={formatDate(unit.vencimientoVerificacion)} />
      )}
      <InfoRow label="Holográma ambiental" value={unit.environmentalHologram} />
      <InfoRow label="Cumplimiento legal" value={formatDate(unit.legalComplianceDate)} />
      <InfoRow label="Verif. mecánica" value={formatDate(unit.lastMechanicalVerification)} />
      <InfoRow label="Verif. ambiental" value={formatDate(unit.lastEnvironmentalVerification)} />
      <InfoRow label="Inicio de protocolo" value={formatDate(unit.protocolStartDate)} />
    </SectionCard>
  );
}

export default ComplianceLegalSection;

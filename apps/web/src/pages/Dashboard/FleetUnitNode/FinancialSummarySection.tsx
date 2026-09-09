import React from 'react';
import { DollarSign } from 'lucide-react';
import AT from '../../../styles/archonTypography';
import { InfoRow, SectionCard, formatMXN } from '../nodes/NodeShared';
import { NodeData } from './types';

const CATEGORY_LABEL: Record<string, string> = {
  LEASE: 'Arrendamiento',
  INSURANCE: 'Seguro',
  MAINTENANCE: 'Mantenimiento',
  FUEL: 'Combustible',
  TIRE: 'Llantas',
  FINE: 'Multas',
  REPAIR: 'Reparación',
  OTHER: 'Otros',
};

/** "Resumen Financiero {year}" card — desglose por categoría + total anual.
 * Extraída de `FleetUnitNode.tsx` (FC167 F2 Gate2); mismo JSX verbatim. */
export function FinancialSummarySection({
  financial,
}: {
  readonly financial: NodeData['financial'];
}): React.JSX.Element {
  return (
    <SectionCard
      title={`Resumen Financiero ${financial.year}`}
      icon={<DollarSign size={16} className="text-[#f2b705]" />}
    >
      {Object.entries(financial.byCategory).map(([cat, total]) => (
        <InfoRow key={cat} label={CATEGORY_LABEL[cat] ?? cat} value={formatMXN(total)} />
      ))}
      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
        <span className="text-archon-base font-black uppercase tracking-[0.15em] text-[#0f2a44]">
          Total del año
        </span>
        <span className="text-archon-lg font-black text-[#0f2a44]">
          {formatMXN(financial.totalCost)}
        </span>
      </div>
      {financial.totalCost === 0 && (
        <p className={`${AT.sectionDescription} text-center pt-4`}>
          Sin transacciones registradas este año
        </p>
      )}
    </SectionCard>
  );
}

export default FinancialSummarySection;

import React from 'react';
import { ClipboardCheck, User, DollarSign } from 'lucide-react';
import ArchonField from '../../ArchonField';
import ArchonSelect from '../../ArchonSelect';
import CurrencyAmountField from '../CurrencyAmountField';
import { RegistrationState } from './useRegistrationState';

/** Panel "Datos Operativos": técnico ejecutor + costo del servicio
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function OperationalPanel({ state }: { readonly state: RegistrationState }): React.JSX.Element {
  return (
    <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 relative z-20 [--card-accent:#0f2a44]">
      <div className="card-sovereign-header">
        <ClipboardCheck className="text-[var(--card-accent)]" size={22} />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">DATOS OPERATIVOS</h3>
      </div>
      <div className="space-y-6 relative z-10">
        <ArchonField label="Técnico Ejecutor" icon={User} required>
          <ArchonSelect
            options={state.technicianOptions}
            value={state.technician}
            onChange={(val: string): void => state.setTechnician(val)}
            placeholder="Buscar técnico..."
            icon={User}
          />
        </ArchonField>
        <ArchonField label="Costo del Servicio" icon={DollarSign}>
          <CurrencyAmountField value={state.cost} onChange={state.setCost} />
        </ArchonField>
      </div>
    </div>
  );
}

export default OperationalPanel;

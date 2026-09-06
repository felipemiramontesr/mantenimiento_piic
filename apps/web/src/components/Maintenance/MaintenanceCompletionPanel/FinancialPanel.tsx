import React from 'react';
import { ClipboardCheck, User, DollarSign } from 'lucide-react';
import ArchonField from '../../ArchonField';
import ArchonSelect from '../../ArchonSelect';
import { CompletionState } from './useCompletionState';

/** Panel "Confirmación Final": técnico ejecutor + costo del servicio
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function FinancialPanel({ state }: { state: CompletionState }): React.JSX.Element {
  return (
    <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 relative z-20 [--card-accent:#f2b705]">
      <div className="card-sovereign-header">
        <ClipboardCheck className="text-[var(--card-accent)]" size={22} />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">CONFIRMACIÓN FINAL</h3>
      </div>
      <div className="space-y-6 relative z-10">
        <ArchonField label="Técnico Ejecutor" icon={User}>
          <ArchonSelect
            options={state.technicianOptions}
            value={state.technician}
            onChange={(val: string): void => state.setTechnician(val)}
            placeholder="Confirmar técnico..."
            icon={User}
          />
        </ArchonField>
        <ArchonField label="Costo Final del Servicio" icon={DollarSign}>
          <div className="flex items-center w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus-within:border-b-[#f2b705] focus-within:bg-white focus-within:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] transition-all duration-300">
            <span className="text-[#0f2a44]/40 font-bold text-archon-lg">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="Ej: 3,450.00"
              className="flex-1 w-full bg-transparent px-2 py-0 border-none outline-none focus:ring-0 text-archon-lg font-mono text-emerald-600 font-bold placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal"
              value={state.cost || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                state.setCost(e.target.valueAsNumber)
              }
            />
            <span className="text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
              MXN
            </span>
          </div>
        </ArchonField>
      </div>
    </div>
  );
}

export default FinancialPanel;

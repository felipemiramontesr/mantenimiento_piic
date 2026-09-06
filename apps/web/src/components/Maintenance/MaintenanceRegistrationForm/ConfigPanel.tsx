import React from 'react';
import { Wrench, Truck, Gauge, Calendar } from 'lucide-react';
import ArchonField from '../../ArchonField';
import ArchonSelect from '../../ArchonSelect';
import { RegistrationState } from './useRegistrationState';
import { inputClass } from './constants';

/** Badge de tipo de servicio UPA, visible cuando ya se conoce el tipo
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function UpaTypeBadge({ state }: { state: RegistrationState }): React.JSX.Element | null {
  const visible =
    state.selectedUnit &&
    (state.isMineUnit || (state.upaPreview !== null && !state.upaPreviewLoading));
  if (!visible) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-archon-base font-black text-[#0f2a44]/50 uppercase tracking-[0.15em]">
        Tipo de Servicio (UPA)
      </p>
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-archon-md font-black uppercase tracking-wider ${state.upaBadge.style}`}
      >
        <Wrench size={11} />
        {state.upaBadge.label}
      </div>
    </div>
  );
}

/** Campos de odómetro al servicio + fecha (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function OdometerAndDateFields({ state }: { state: RegistrationState }): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ArchonField label="Odómetro al Servicio" icon={Gauge} required>
        <div className="relative flex items-center">
          <input
            required
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Ej: 125000"
            className={`${inputClass} font-mono pr-14`}
            value={state.odometerAtService || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              state.setOdometerAtService(e.target.valueAsNumber)
            }
          />
          <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
            KM
          </span>
        </div>
      </ArchonField>
      <ArchonField label="Fecha de Servicio" icon={Calendar} required>
        <input
          required
          type="date"
          className={`${inputClass} font-mono`}
          value={state.serviceDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            state.setServiceDate(e.target.value)
          }
        />
      </ArchonField>
    </div>
  );
}

/** Panel "Configuración": unidad + tipo UPA + odómetro/fecha
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function ConfigPanel({ state }: { state: RegistrationState }): React.JSX.Element {
  return (
    <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 relative z-20 [--card-accent:#0f2a44]">
      <div className="card-sovereign-header">
        <Wrench className="text-[var(--card-accent)]" size={22} />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">CONFIGURACIÓN</h3>
      </div>
      <div className="space-y-6 relative z-10">
        <ArchonField label="1. Unidad Asignada" icon={Truck} required>
          <ArchonSelect
            options={state.unitOptions}
            value={state.selectedUnit}
            onChange={(val: string): void => state.setSelectedUnit(val)}
            placeholder="Buscar unidad..."
            icon={Truck}
          />
        </ArchonField>
        <UpaTypeBadge state={state} />
        <OdometerAndDateFields state={state} />
      </div>
    </div>
  );
}

export default ConfigPanel;

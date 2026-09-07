import React from 'react';
import { Droplets, Gauge, DollarSign } from 'lucide-react';
import ArchonField from '../../ArchonField';
import ArchonFuelSensor from '../../Routes/ArchonFuelSensor';
import { CompletionState } from './useCompletionState';

/** Tarjeta de sensor de nivel de combustible al cierre
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function FuelLevelCard({ state }: { readonly state: CompletionState }): React.JSX.Element {
  return (
    <div className="card-archon-sovereign bg-white p-10 space-y-8 [--card-accent:#f2b705]">
      <div className="card-sovereign-header">
        <Droplets className="text-[var(--card-accent)]" size={22} />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">NIVEL DE COMBUSTIBLE</h3>
      </div>
      <div className="space-y-3">
        <ArchonFuelSensor value={state.fuelLevelEnd} onChange={state.setFuelLevelEnd} />
      </div>
    </div>
  );
}

/** Campo de litros de combustible cargados (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function FuelLitersField({ state }: { readonly state: CompletionState }): React.JSX.Element {
  return (
    <ArchonField label="Litros Cargados" icon={Droplets}>
      <div className="relative flex items-center">
        <Droplets
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30"
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={state.fuelLitersLoaded}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            state.setFuelLitersLoaded(e.target.value.replace(/[^0-9.]/g, ''))
          }
          className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white px-4 pl-9 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal outline-none"
        />
      </div>
    </ArchonField>
  );
}

/** Tarjeta de litros/monto del ticket de combustible de retorno
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function FuelReturnDataCard({ state }: { readonly state: CompletionState }): React.JSX.Element {
  return (
    <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 [--card-accent:#f2b705]">
      <div className="card-sovereign-header">
        <Gauge className="text-[var(--card-accent)]" size={22} />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">DATOS DE RETORNO</h3>
      </div>
      <div className="space-y-6">
        <FuelLitersField state={state} />
        <ArchonField label="Monto del Ticket de Combustible" icon={DollarSign}>
          <div className="flex items-center w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus-within:border-b-[#f2b705] focus-within:bg-white focus-within:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] transition-all duration-300">
            <span className="text-[#0f2a44]/40 font-bold text-archon-lg">$</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              className="flex-1 w-full bg-transparent px-2 py-0 border-none outline-none focus:ring-0 text-archon-lg font-mono text-emerald-600 font-bold placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal"
              value={state.fuelAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                state.setFuelAmount(e.target.value.replace(/[^0-9.]/g, ''))
              }
            />
            <span className="text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
              MXN
            </span>
          </div>
          <p className="text-archon-xs font-bold text-[#0f2a44]/40 italic mt-1">
            * Incluye combustible y aditivos del ticket.
          </p>
        </ArchonField>
      </div>
    </div>
  );
}

/** Sección de telemetría de combustible: sensor de nivel + litros/monto del ticket
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function FuelTelemetrySection({ state }: { readonly state: CompletionState }): React.JSX.Element {
  return (
    <div className="archon-grid-2-sovereign items-start gap-10">
      <FuelLevelCard state={state} />
      <FuelReturnDataCard state={state} />
    </div>
  );
}

export default FuelTelemetrySection;

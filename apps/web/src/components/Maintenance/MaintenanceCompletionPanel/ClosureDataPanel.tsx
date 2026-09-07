import React from 'react';
import { Gauge, Calendar } from 'lucide-react';
import { MaintenanceLog } from '../../../types/maintenance';
import ArchonField from '../../ArchonField';
import { CompletionState } from './useCompletionState';
import { inputClass } from './constants';

interface OdometerFieldsProps {
  readonly log: MaintenanceLog;
  readonly state: CompletionState;
}

/** Campos de odómetro de entrada/salida del taller (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function OdometerFields({ log, state }: OdometerFieldsProps): React.JSX.Element {
  return (
    <>
      <ArchonField label="Odómetro de Entrada al Taller" icon={Gauge} required>
        <div className="relative flex items-center">
          <input
            required
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Ej: 126500"
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
        <p className="text-archon-base text-slate-400 mt-1 font-mono pl-1">
          Registro original: {Number(log.odometer_at_service).toLocaleString()} km
        </p>
      </ArchonField>
      <ArchonField label="Odómetro de Salida del Taller" icon={Gauge}>
        <div className="relative flex items-center">
          <input
            type="number"
            min={state.odometerAtService}
            inputMode="numeric"
            placeholder="Ej: 126680"
            className={`${inputClass} font-mono pr-14`}
            value={state.endOdometer || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              state.setEndOdometer(e.target.valueAsNumber)
            }
          />
          <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
            KM
          </span>
        </div>
        <p className="text-archon-base text-slate-400 mt-1 font-mono pl-1">
          Incluye traslado y pruebas de taller
        </p>
      </ArchonField>
    </>
  );
}

interface ClosureDataPanelProps {
  readonly log: MaintenanceLog;
  readonly state: CompletionState;
}

/** Panel "Datos de Cierre": odómetros de entrada/salida + fecha
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function ClosureDataPanel({ log, state }: ClosureDataPanelProps): React.JSX.Element {
  return (
    <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 relative z-20 [--card-accent:#f2b705]">
      <div className="card-sovereign-header">
        <Gauge className="text-[var(--card-accent)]" size={22} />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">DATOS DE CIERRE</h3>
      </div>
      <div className="space-y-6 relative z-10">
        <OdometerFields log={log} state={state} />
        <ArchonField label="Fecha de Cierre" icon={Calendar}>
          <input
            type="date"
            className={`${inputClass} font-mono`}
            value={state.serviceDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              state.setServiceDate(e.target.value)
            }
          />
        </ArchonField>
      </div>
    </div>
  );
}

export default ClosureDataPanel;

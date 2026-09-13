import React from 'react';
import { Gauge, Milestone, Fuel, Info, AlertCircle } from 'lucide-react';
import ArchonField from '../../ArchonField';
import ArchonFuelSensor from '../ArchonFuelSensor';
import FuelVolumeChart from '../FuelVolumeChart';
import { RouteAssignmentPanelProps } from './types';

interface RouteTelemetryPanelProps extends RouteAssignmentPanelProps {
  tankCapacity: number;
  startReadingDisplay: string;
}

/** Estado sin unidad seleccionada — telemetría inactiva (FC163 F2B5). */
function DisconnectedState(): React.JSX.Element {
  return (
    <div className="bg-white rounded-lg border-2 border-dashed border-[#0f2a44]/10 p-8 flex flex-col items-center justify-center text-center space-y-4 mb-4">
      <div className="bg-[#0f2a44]/5 p-4 rounded-full">
        <AlertCircle size={32} className="text-[#0f2a44]/20" />
      </div>
      <div className="space-y-1">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0f2a44]/40">
          SISTEMA DESCONECTADO
        </h3>
        <p className="text-archon-base font-bold text-[#0f2a44]/30">
          SELECCIONE UNA UNIDAD PARA ACTIVAR TELEMETRÍA
        </p>
      </div>
    </div>
  );
}

interface TelemetryHeaderProps {
  readonly isReturn: boolean;
  readonly startReadingDisplay: string;
}

/** Encabezado de fase III + badge de salida cuando es retorno (FC163 F2B5). */
function TelemetryHeader({
  isReturn,
  startReadingDisplay,
}: TelemetryHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <div className="card-sovereign-header !mb-0 !w-auto">
        <Gauge size={22} className="text-[var(--card-accent)]" />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">
          Fase III — Telemetría de {isReturn ? 'Retorno' : 'Salida'}
        </h3>
      </div>
      {isReturn && (
        <div className="text-archon-sm bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-black uppercase tracking-widest">
          Salida: {startReadingDisplay} KM
        </div>
      )}
    </div>
  );
}

type NumericReading = number | string | undefined;

interface OdometerSectionProps {
  readonly isEdit: boolean;
  readonly startReading: NumericReading;
  readonly endReading: NumericReading;
  readonly startReadingDisplay: string;
  readonly onStartReadingChange: (v: number) => void;
  readonly onEndReadingChange: (v: number) => void;
}

type OdometerVariant = 'plain' | 'emerald' | 'blue';

const ODOMETER_INPUT_CLASS: Record<OdometerVariant, string> = {
  plain: 'archon-input pl-10',
  emerald:
    'w-full h-11 bg-emerald-50/50 border-0 border-b-2 border-emerald-500/20 focus:border-emerald-500 focus:bg-white px-4 pl-8 rounded-[4px] text-sm font-mono font-bold text-[#0f2a44] outline-none transition-all',
  blue: 'w-full h-11 bg-blue-50/50 border-0 border-b-2 border-blue-500/20 focus:border-blue-500 focus:bg-white px-4 pl-8 rounded-[4px] text-sm font-mono font-bold text-[#0f2a44] outline-none transition-all',
};

const ODOMETER_HASH_CLASS: Record<OdometerVariant, string> = {
  plain: 'absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30 font-bold',
  emerald: 'absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500/30 font-bold',
  blue: 'absolute left-2 top-1/2 -translate-y-1/2 text-blue-500/30 font-bold',
};

interface OdometerInputProps {
  readonly value: NumericReading;
  readonly onChange: (v: number) => void;
  readonly variant: OdometerVariant;
  readonly inputHint?: string;
}

/** Input numérico con prefijo "#", en 3 variantes de acento (FC163 F2B5). */
function OdometerInput({
  value,
  onChange,
  variant,
  inputHint,
}: OdometerInputProps): React.JSX.Element {
  return (
    <div className="relative">
      <input
        type="number"
        value={value || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
          onChange(Number(e.target.value))
        }
        placeholder={inputHint}
        className={ODOMETER_INPUT_CLASS[variant]}
      />
      <span className={ODOMETER_HASH_CLASS[variant]}>#</span>
    </div>
  );
}

/** Lectura de odómetro: campo único (alta) o par Salida/Llegada (edición) (FC163 F2B5). */
function OdometerSection({
  isEdit,
  startReading,
  endReading,
  startReadingDisplay,
  onStartReadingChange,
  onEndReadingChange,
}: OdometerSectionProps): React.JSX.Element {
  if (!isEdit) {
    return (
      <ArchonField label="Lectura de Odómetro (KM)" icon={Milestone}>
        <OdometerInput
          value={startReading}
          onChange={onStartReadingChange}
          variant="plain"
          inputHint="0.00"
        />
        <p className="text-archon-base font-bold text-[#0f2a44]/40 flex items-center gap-1">
          <Info size={10} />
          Basado en última lectura: {startReadingDisplay} KM
        </p>
      </ArchonField>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4">
      <ArchonField label="Salida (KM)" icon={Milestone}>
        <OdometerInput value={startReading} onChange={onStartReadingChange} variant="emerald" />
      </ArchonField>
      <ArchonField label="Llegada (KM)" icon={Milestone}>
        <OdometerInput value={endReading} onChange={onEndReadingChange} variant="blue" />
      </ArchonField>
    </div>
  );
}

interface LitersSelectorProps {
  readonly tankCapacity: number;
  readonly litersValue: number | string;
  readonly onLitersChange: (pct: number) => void;
}

/** Selector dual de litros cargados, con guardas de rango (FC163 F2B5). */
function LitersSelector({
  tankCapacity,
  litersValue,
  onLitersChange,
}: LitersSelectorProps): React.JSX.Element {
  if (tankCapacity <= 0) {
    return (
      <span className="text-archon-xs font-black text-rose-500 bg-rose-50 px-2 py-1 rounded border border-rose-200 uppercase tracking-wider">
        Falta Capacidad Tanque
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1 bg-[#0f2a44]/5 px-2 py-0.5 rounded border border-[#0f2a44]/10 focus-within:border-[#f2b705] focus-within:bg-white transition-all">
      <input
        type="number"
        step="0.1"
        min="0"
        max={tankCapacity}
        value={litersValue}
        onChange={(e): void => {
          const inputVal = e.target.value;
          if (inputVal === '') {
            onLitersChange(0);
            return;
          }
          const liters = Math.max(0, Math.min(tankCapacity, Number(inputVal)));
          onLitersChange((liters / tankCapacity) * 100);
        }}
        className="w-12 bg-transparent font-mono text-xs text-[#0f2a44] font-black focus:outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-archon-sm font-black text-[#0f2a44]/40 uppercase tracking-tight select-none">
        L
      </span>
    </div>
  );
}

interface FuelLevelSectionProps {
  readonly isEdit: boolean;
  readonly fuelPct: NumericReading;
  readonly tankCapacity: number;
  readonly litersValue: number | string;
  readonly onFuelPctChange: (val: number) => void;
  readonly onLitersChange: (pct: number) => void;
}

/** Nivel de combustible: badge %, selector de litros, sensor visual y chart (FC163 F2B5). */
function FuelLevelSection({
  isEdit,
  fuelPct,
  tankCapacity,
  litersValue,
  onFuelPctChange,
  onLitersChange,
}: FuelLevelSectionProps): React.JSX.Element {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44]/50 flex items-center gap-1.5">
          <Fuel className="w-3 h-3" />
          {isEdit ? 'Nivel al Llegar (%)' : 'Nivel de Salida (%)'}
        </label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-archon-md bg-[#0f2a44]/5 text-[#0f2a44]/60 px-2 py-0.5 rounded font-bold border border-[#0f2a44]/10">
            {Number(fuelPct).toFixed(1)}%
          </span>
          <LitersSelector
            tankCapacity={tankCapacity}
            litersValue={litersValue}
            onLitersChange={onLitersChange}
          />
        </div>
      </div>

      <div className="px-2">
        <ArchonFuelSensor value={Number(fuelPct)} onChange={onFuelPctChange} />
      </div>

      {tankCapacity > 0 && (
        <div className="pt-2 border-t border-[#0f2a44]/5">
          <FuelVolumeChart
            currentLevel={Number(fuelPct)}
            totalCapacity={tankCapacity}
            color={Number(fuelPct) > 20 ? '#0f2a44' : '#ef4444'}
          />
        </div>
      )}
    </div>
  );
}

/**
 * 🔱 Archon Panel: Route Telemetry (v.75.2.0 - Certified)
 * Precision cockpit interface for vehicle sensors.
 * Complies with Forensic Integrity Tests (Zero Noise).
 */
const RouteTelemetryPanel: React.FC<RouteTelemetryPanelProps> = ({
  formData,
  updateForm,
  isEdit,
  tankCapacity,
  startReadingDisplay,
}) => {
  // 🛡️ Failsafe: Disconnected State (Required by Certification)
  if (!formData.unitId) {
    return <DisconnectedState />;
  }

  const isReturn = isEdit;
  const fuelPct = isEdit ? formData.arrivalFuelLevel : formData.fuelLevel;
  const litersValue = ((): number | string => {
    if (tankCapacity <= 0) return '';
    if (fuelPct === undefined || fuelPct === null || fuelPct === '') return '';
    return Number(((Number(fuelPct) / 100) * tankCapacity).toFixed(1));
  })();

  return (
    <div className="space-y-4">
      <TelemetryHeader isReturn={isReturn} startReadingDisplay={startReadingDisplay} />

      <div className="space-y-6 pt-2">
        <div className="space-y-4">
          <OdometerSection
            isEdit={isEdit}
            startReading={formData.startReading}
            endReading={formData.endReading}
            startReadingDisplay={startReadingDisplay}
            onStartReadingChange={(v): void => updateForm({ startReading: v })}
            onEndReadingChange={(v): void => updateForm({ endReading: v })}
          />
        </div>

        <FuelLevelSection
          isEdit={isEdit}
          fuelPct={fuelPct}
          tankCapacity={tankCapacity}
          litersValue={litersValue}
          onFuelPctChange={(val): void =>
            isEdit ? updateForm({ arrivalFuelLevel: val }) : updateForm({ fuelLevel: val })
          }
          onLitersChange={(pct): void =>
            isEdit ? updateForm({ arrivalFuelLevel: pct }) : updateForm({ fuelLevel: pct })
          }
        />
      </div>
    </div>
  );
};

export default React.memo(RouteTelemetryPanel);

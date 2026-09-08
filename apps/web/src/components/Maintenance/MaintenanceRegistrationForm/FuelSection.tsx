import React from 'react';
import { Gauge, DollarSign, Droplets } from 'lucide-react';
import { FleetUnit } from '../../../types/fleet';
import ArchonField from '../../ArchonField';
import ArchonFuelSensor from '../../Routes/ArchonFuelSensor';

export interface FuelSectionProps {
  isInProgress: boolean;
  unit: FleetUnit | undefined;
  fuelLevelEnd: number;
  onFuelLevelEnd: (v: number) => void;
  endOdometer: number;
  onEndOdometer: (v: number) => void;
  odometerAtService: number;
  fuelLitersLoaded: string;
  onFuelLitersLoaded: (v: string) => void;
  fuelAmount: string;
  onFuelAmount: (v: string) => void;
  inputClass: string;
}

type FuelSensorCardProps = Pick<
  FuelSectionProps,
  'isInProgress' | 'fuelLevelEnd' | 'onFuelLevelEnd'
>;

/** Card izquierda de FuelSection: sensor de nivel de combustible (FC164 Adenda G2, split Alfa 211_AN). */
const FuelSensorCard: React.FC<FuelSensorCardProps> = ({
  isInProgress,
  fuelLevelEnd,
  onFuelLevelEnd,
}) => (
  <div className="card-archon-sovereign bg-white p-10 space-y-8 [--card-accent:#f2b705]">
    <div className="card-sovereign-header">
      <Droplets className="text-[var(--card-accent)]" size={22} />
      <h3 className="card-sovereign-title text-archon-xl opacity-100">
        {isInProgress ? 'NIVEL DE SALIDA' : 'NIVEL DE COMBUSTIBLE'}
      </h3>
    </div>
    <div className="space-y-3">
      <ArchonFuelSensor value={fuelLevelEnd} onChange={onFuelLevelEnd} disabled={isInProgress} />
      {isInProgress && (
        <p className="text-archon-base text-[#0f2a44]/40 italic pt-1">
          Nivel auto-heredado del sistema. El nivel de retorno se captura al cerrar el servicio.
        </p>
      )}
    </div>
  </div>
);

type EndOdometerFieldProps = Pick<
  FuelSectionProps,
  'odometerAtService' | 'endOdometer' | 'onEndOdometer' | 'inputClass'
>;

/** Campo de odómetro de salida (FC164 Adenda G2, split Alfa 211_AN — sub-split de FuelMetricsCard). */
const EndOdometerField: React.FC<EndOdometerFieldProps> = ({
  odometerAtService,
  endOdometer,
  onEndOdometer,
  inputClass,
}) => (
  <ArchonField label="Odómetro de Salida" icon={Gauge}>
    <div className="relative flex items-center">
      <input
        type="number"
        min={odometerAtService}
        placeholder="Ej: 125180"
        className={`${inputClass} font-mono pr-14`}
        value={endOdometer || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
          onEndOdometer(e.target.valueAsNumber)
        }
      />
      <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
        KM
      </span>
    </div>
    <p className="text-archon-base text-slate-400 mt-1 font-mono pl-1">
      Incluye traslado y pruebas de campo
    </p>
  </ArchonField>
);

type FuelLitersFieldProps = Pick<
  FuelSectionProps,
  'fuelLitersLoaded' | 'onFuelLitersLoaded' | 'inputClass'
>;

/** Campo de litros cargados (FC164 Adenda G2, split Alfa 211_AN — sub-split de FuelMetricsCard). */
const FuelLitersField: React.FC<FuelLitersFieldProps> = ({
  fuelLitersLoaded,
  onFuelLitersLoaded,
  inputClass,
}) => (
  <ArchonField label="Litros Cargados" icon={Droplets}>
    <div className="relative flex items-center">
      <input
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        className={`${inputClass} font-mono pr-14`}
        value={fuelLitersLoaded}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
          onFuelLitersLoaded(e.target.value.replace(/[^0-9.]/g, ''))
        }
      />
      <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
        LTS
      </span>
    </div>
  </ArchonField>
);

type FuelAmountFieldProps = Pick<FuelSectionProps, 'fuelAmount' | 'onFuelAmount'>;

/** Campo de monto del ticket (FC164 Adenda G2, split Alfa 211_AN — sub-split de FuelMetricsCard). */
const FuelAmountField: React.FC<FuelAmountFieldProps> = ({ fuelAmount, onFuelAmount }) => (
  <ArchonField label="Monto del Ticket de Combustible" icon={DollarSign}>
    <div className="flex items-center w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus-within:border-b-[#f2b705] focus-within:bg-white focus-within:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] transition-all duration-300">
      <span className="text-[#0f2a44]/40 font-bold text-archon-lg">$</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        className="flex-1 w-full bg-transparent px-2 py-0 border-none outline-none focus:ring-0 text-archon-lg font-mono text-emerald-600 font-bold placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal"
        value={fuelAmount}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
          onFuelAmount(e.target.value.replace(/[^0-9.]/g, ''))
        }
      />
      <span className="text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
        MXN
      </span>
    </div>
  </ArchonField>
);

type FuelMetricsInputsProps = Pick<
  FuelSectionProps,
  | 'odometerAtService'
  | 'endOdometer'
  | 'onEndOdometer'
  | 'fuelLitersLoaded'
  | 'onFuelLitersLoaded'
  | 'fuelAmount'
  | 'onFuelAmount'
  | 'inputClass'
>;

/** Los 3 campos de captura de cierre (FC164 Adenda G2, split Alfa 211_AN — sub-split de FuelMetricsCard). */
const FuelMetricsInputs: React.FC<FuelMetricsInputsProps> = (props) => (
  <div className="space-y-6">
    <EndOdometerField {...props} />
    <FuelLitersField {...props} />
    <FuelAmountField {...props} />
  </div>
);

/** Vista informativa de solo-lectura cuando isInProgress=true (FC164 Adenda G2, split Alfa 211_AN). */
const FuelMetricsSummary: React.FC<Pick<FuelSectionProps, 'unit'>> = ({ unit }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Gauge size={14} className="text-[#0f2a44]/30 shrink-0" />
      <span className="font-mono text-archon-lg font-bold text-[#0f2a44]">
        {Number(unit?.odometer ?? 0).toLocaleString()} km
      </span>
    </div>
    <p className="text-archon-base text-[#0f2a44]/40">
      Odómetro de entrada y nivel de combustible se registran automáticamente. Al retorno del
      taller, capture el odómetro final y nivel en el formulario de cierre.
    </p>
  </div>
);

const FuelMetricsCard: React.FC<FuelSectionProps> = ({ isInProgress, ...rest }) => (
  <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 [--card-accent:#f2b705]">
    <div className="card-sovereign-header">
      <Gauge className="text-[var(--card-accent)]" size={22} />
      <h3 className="card-sovereign-title text-archon-xl opacity-100">
        {isInProgress ? 'ESTADO DE SALIDA' : 'DATOS DE SALIDA'}
      </h3>
    </div>
    {!isInProgress ? <FuelMetricsInputs {...rest} /> : <FuelMetricsSummary unit={rest.unit} />}
  </div>
);

/** Sección de telemetría de combustible: sensor de nivel + datos de salida (FC164 Adenda G2, split Alfa 211_AN). */
const FuelSection: React.FC<FuelSectionProps> = (props) => (
  <div className="archon-grid-2-sovereign items-start gap-10">
    <FuelSensorCard {...props} />
    <FuelMetricsCard {...props} />
  </div>
);

export default FuelSection;

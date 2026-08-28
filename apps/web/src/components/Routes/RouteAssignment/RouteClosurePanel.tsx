import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Droplets } from 'lucide-react';
import ArchonImageUploader from '../../ArchonImageUploader';
import { RouteClosurePanelProps } from './types';

/** Encabezado de fase IV: evidencia y cierre (FC163 F2B5). */
function ClosurePanelHeader(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-[#f2b705] p-2 rounded-[4px]">
        <Camera size={20} className="text-[#0f2a44]" />
      </div>
      <div>
        <span className="text-archon-base font-black uppercase tracking-[0.2em] text-amber-600 opacity-50">
          Fase IV
        </span>
        <h3 className="text-archon-xl font-black uppercase tracking-tight text-[#0f2a44]">
          Evidencia y Cierre
        </h3>
      </div>
    </div>
  );
}

interface FuelLoadedFieldProps {
  value: string | number;
  onChange: (v: string) => void;
  tankCapacity: number;
  consumedLiters: number | null;
}

interface FuelConsumptionIndicatorProps {
  tankCapacity: number;
  consumedLiters: number | null;
}

/** Indicador de consumo de combustible calculado, o aviso si no hay capacidad de tanque (FC163 F2B5). */
function FuelConsumptionIndicator({
  tankCapacity,
  consumedLiters,
}: FuelConsumptionIndicatorProps): React.JSX.Element {
  if (tankCapacity <= 0) {
    return (
      <div className="flex items-center justify-between bg-rose-50 border border-rose-200/50 p-2 rounded-[4px] mt-1.5 select-none">
        <span className="text-archon-sm font-black uppercase tracking-wider text-rose-600/70">
          🔱 Consumo de Ruta
        </span>
        <span className="text-archon-xs font-bold text-rose-500 uppercase tracking-wider">
          Sin Capacidad de Tanque
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between bg-[#0f2a44]/5 border border-[#0f2a44]/10 p-2 rounded-[4px] mt-1.5 select-none">
      <span className="text-archon-sm font-black uppercase tracking-wider text-[#0f2a44]/60 flex items-center gap-1">
        🔱 Consumo de Ruta
      </span>
      <span className="font-mono text-xs font-black text-[#0f2a44]">
        {consumedLiters !== null ? `${consumedLiters.toFixed(1)} L` : '--'}
      </span>
    </div>
  );
}

/** Campo de litros de combustible cargados + consumo calculado (FC163 F2B5). */
function FuelLoadedField({
  value,
  onChange,
  tankCapacity,
  consumedLiters,
}: FuelLoadedFieldProps): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="route-fuel-liters-loaded"
        className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50"
      >
        Litros de Combustible Cargados
      </label>
      <div className="relative">
        <Droplets
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30"
        />
        <input
          id="route-fuel-liters-loaded"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            onChange(e.target.value.replace(/[^0-9.]/g, ''))
          }
          className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-amber-500 p-2.5 pl-10 text-xs font-black text-[#0f2a44] placeholder:text-[#0f2a44]/30 outline-none transition-colors rounded-[4px]"
        />
      </div>
      <FuelConsumptionIndicator tankCapacity={tankCapacity} consumedLiters={consumedLiters} />
    </div>
  );
}

interface FuelAmountFieldProps {
  value: string | number;
  onChange: (v: string) => void;
}

/** Campo de monto total del ticket de combustible (FC163 F2B5). */
function FuelAmountField({ value, onChange }: FuelAmountFieldProps): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="route-fuel-amount"
        className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50 flex items-center justify-between"
      >
        Monto Total del Ticket
        <span className="text-amber-600 font-black">$</span>
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/40 font-black text-archon-base">
          $
        </span>
        <input
          id="route-fuel-amount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            onChange(e.target.value.replace(/[^0-9.]/g, ''))
          }
          className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-amber-500 p-2.5 pl-10 text-xs font-black text-[#0f2a44] placeholder:text-[#0f2a44]/30 outline-none transition-colors rounded-[4px]"
        />
      </div>
      <p className="text-archon-xs font-bold text-[#0f2a44]/40 italic">
        * Incluye combustible, aditivos y otros insumos del ticket.
      </p>
    </div>
  );
}

interface AdditivesChecklistProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

/** Checkbox de aditivos aplicados (FC163 F2B5). */
function AdditivesChecklist({ checked, onChange }: AdditivesChecklistProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="additivesCheck"
          checked={checked}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
        />
        <label htmlFor="additivesCheck" className="text-xs font-bold text-[#0f2a44]">
          ¿Se aplicaron Aditivos?
        </label>
      </div>
    </div>
  );
}

interface TirePressureFieldsProps {
  tireData: Record<string, string>;
  onUpdateTire: (pos: string, val: string) => void;
}

/** Campos de presión de neumáticos por posición (FC163 F2B5). */
function TirePressureFields({
  tireData,
  onUpdateTire,
}: TirePressureFieldsProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      <span className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
        Presión de Neumáticos (PSI)
      </span>
      <div className="grid grid-cols-4 gap-2">
        {['DI', 'DD', 'TI', 'TD'].map((pos) => (
          <div key={pos} className="space-y-1">
            <span className="text-archon-xs font-black text-[#0f2a44] opacity-40 block text-center">
              {pos}
            </span>
            <input
              type="text"
              placeholder="--"
              value={tireData[pos] || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                onUpdateTire(pos, e.target.value)
              }
              className="w-full bg-white border border-[#0f2a44]/10 p-1.5 text-center text-archon-base font-black text-[#0f2a44] rounded-[4px] focus:border-amber-500 outline-none transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ObservationsFieldProps {
  value: string;
  onChange: (v: string) => void;
}

/** Campo de observaciones de la misión (FC163 F2B5). */
function ObservationsField({ value, onChange }: ObservationsFieldProps): React.JSX.Element {
  return (
    <div className="space-y-2 pt-4 border-t border-[#0f2a44]/5">
      <label
        htmlFor="route-closure-observations"
        className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50"
      >
        Observaciones de la misión
      </label>
      <textarea
        id="route-closure-observations"
        rows={3}
        placeholder="Observaciones de la misión..."
        value={value}
        onChange={(e): void => onChange(e.target.value)}
        className="w-full bg-white border-2 border-[#0f2a44]/5 focus:border-[#f2b705] p-3 text-xs font-bold text-[#0f2a44] outline-none transition-colors resize-none rounded-[4px] disabled:opacity-50"
      />
    </div>
  );
}

interface ForensicChecklistSectionProps {
  additivesCheck: boolean;
  onAdditivesChange: (v: boolean) => void;
  tireData: Record<string, string>;
  onUpdateTire: (pos: string, val: string) => void;
}

/** Checklist forense: aditivos + presión de neumáticos (FC163 F2B5). */
function ForensicChecklistSection({
  additivesCheck,
  onAdditivesChange,
  tireData,
  onUpdateTire,
}: ForensicChecklistSectionProps): React.JSX.Element {
  return (
    <div className="pt-4 border-t border-[#0f2a44]/5 space-y-4">
      <AdditivesChecklist checked={additivesCheck} onChange={onAdditivesChange} />
      <TirePressureFields tireData={tireData} onUpdateTire={onUpdateTire} />
    </div>
  );
}

interface FuelEvidenceSectionProps {
  fuelImages: string[];
  onChange: (imgs: string[]) => void;
}

/** Sección de captura de evidencia fotográfica del ticket de combustible (FC163 F2B5). */
function FuelEvidenceSection({
  fuelImages,
  onChange,
}: FuelEvidenceSectionProps): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <span className="text-archon-base font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
        Ticket de Combustible (Evidencia)
      </span>
      <ArchonImageUploader
        images={fuelImages}
        onChange={onChange}
        title="Capturar Ticket"
        maxImages={4}
        reducedHeight={true}
      />
    </div>
  );
}

function useClosurePanelState(
  formData: RouteClosurePanelProps['formData'],
  updateForm: RouteClosurePanelProps['updateForm'],
  tankCapacity: number
): {
  consumedLiters: number | null;
  tireData: Record<string, string>;
  fuelImages: string[];
  updateTire: (pos: string, val: string) => void;
} {
  const consumedLiters = React.useMemo(() => {
    if (tankCapacity <= 0) return null;
    const startPct = Number(formData.fuelLevel || 0);
    const endPct = Number(formData.arrivalFuelLevel || 0);
    const loadedLiters = Number(formData.fuelLitersLoaded || 0);
    const startLiters = (startPct / 100) * tankCapacity;
    const endLiters = (endPct / 100) * tankCapacity;
    const consumed = startLiters - endLiters + loadedLiters;
    return Math.max(0, consumed);
  }, [formData.fuelLevel, formData.arrivalFuelLevel, formData.fuelLitersLoaded, tankCapacity]);

  const tireData = React.useMemo(() => {
    try {
      return JSON.parse(formData.tirePressureJson || '{}');
    } catch {
      return {};
    }
  }, [formData.tirePressureJson]);

  const fuelImages = React.useMemo(() => {
    const val = formData.fuelTicketImage;
    if (!val) return [];
    if (val.startsWith('[')) {
      try {
        return JSON.parse(val) as string[];
      } catch {
        return [val];
      }
    }
    return [val];
  }, [formData.fuelTicketImage]);

  const updateTire = (pos: string, val: string): void => {
    const newTires = { ...tireData, [pos]: val };
    updateForm({ tirePressureJson: JSON.stringify(newTires) });
  };

  return { consumedLiters, tireData, fuelImages, updateTire };
}

/**
 * 🔱 Archon Panel: Route Closure (Fase IV)
 * Handles final evidence capture, fuel tickets and industrial telemetry synchronization.
 */
const RouteClosurePanel: React.FC<RouteClosurePanelProps> = ({
  formData,
  updateForm,
  tankCapacity,
}) => {
  const { consumedLiters, tireData, fuelImages, updateTire } = useClosurePanelState(
    formData,
    updateForm,
    tankCapacity
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 pt-8 border-t border-[#0f2a44]/5"
    >
      <ClosurePanelHeader />

      <div className="bg-amber-50/30 border border-amber-200/50 p-3 rounded-[4px] space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <FuelLoadedField
            value={formData.fuelLitersLoaded}
            onChange={(v): void => updateForm({ fuelLitersLoaded: v })}
            tankCapacity={tankCapacity}
            consumedLiters={consumedLiters}
          />
          <FuelAmountField
            value={formData.fuelAmount}
            onChange={(v): void => updateForm({ fuelAmount: v })}
          />
        </div>

        <FuelEvidenceSection
          fuelImages={fuelImages}
          onChange={(imgs: string[]): void => {
            updateForm({ fuelTicketImage: imgs.length > 0 ? JSON.stringify(imgs) : '' });
          }}
        />

        <ForensicChecklistSection
          additivesCheck={formData.additivesCheck}
          onAdditivesChange={(v): void => updateForm({ additivesCheck: v })}
          tireData={tireData}
          onUpdateTire={updateTire}
        />
      </div>

      <ObservationsField
        value={formData.description}
        onChange={(v): void => updateForm({ description: v })}
      />
    </motion.div>
  );
};

export default React.memo(RouteClosurePanel);

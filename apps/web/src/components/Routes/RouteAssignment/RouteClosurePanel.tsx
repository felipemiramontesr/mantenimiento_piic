import React from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Droplets,
  DollarSign,
  Gauge,
  Image as ImageIcon,
  MessageSquare,
} from 'lucide-react';
import ArchonField from '../../ArchonField';
import ArchonImageUploader from '../../ArchonImageUploader';
import { RouteClosurePanelProps } from './types';

/** Encabezado de fase IV: evidencia y cierre (FC163 F2B5). */
function ClosurePanelHeader(): React.JSX.Element {
  return (
    <div className="card-sovereign-header">
      <Camera size={22} className="text-[var(--card-accent)]" />
      <h3 className="card-sovereign-title text-archon-xl opacity-100">
        Fase IV — Evidencia y Cierre
      </h3>
    </div>
  );
}

interface FuelLoadedFieldProps {
  readonly value: string | number;
  readonly onChange: (v: string) => void;
  readonly tankCapacity: number;
  readonly consumedLiters: number | null;
}

interface FuelConsumptionIndicatorProps {
  readonly tankCapacity: number;
  readonly consumedLiters: number | null;
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
  // Invariante: `consumedLiters` (useClosurePanelState) es `null` sii
  // `tankCapacity<=0` — el `if` de arriba ya devolvió en ese caso, así que
  // llegar aquí garantiza `consumedLiters` real (FC165 F3 Slice3.2 Batch1,
  // purga de fallback inalcanzable).
  return (
    <div className="flex items-center justify-between bg-[#0f2a44]/5 border border-[#0f2a44]/10 p-2 rounded-[4px] mt-1.5 select-none">
      <span className="text-archon-sm font-black uppercase tracking-wider text-[#0f2a44]/60 flex items-center gap-1">
        🔱 Consumo de Ruta
      </span>
      <span className="font-mono text-xs font-black text-[#0f2a44]">
        {(consumedLiters as number).toFixed(1)} L
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
    <ArchonField label="Litros de Combustible Cargados" icon={Droplets}>
      <input
        id="route-fuel-liters-loaded"
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
          onChange(e.target.value.replace(/[^0-9.]/g, ''))
        }
        className="archon-input"
      />
      <FuelConsumptionIndicator tankCapacity={tankCapacity} consumedLiters={consumedLiters} />
    </ArchonField>
  );
}

interface FuelAmountFieldProps {
  readonly value: string | number;
  readonly onChange: (v: string) => void;
}

/** Campo de monto total del ticket de combustible (FC163 F2B5). */
function FuelAmountField({ value, onChange }: FuelAmountFieldProps): React.JSX.Element {
  return (
    <ArchonField label="Monto Total del Ticket" icon={DollarSign}>
      <input
        id="route-fuel-amount"
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
          onChange(e.target.value.replace(/[^0-9.]/g, ''))
        }
        className="archon-input"
      />
      <p className="text-archon-xs font-bold text-[#0f2a44]/40 italic">
        * Incluye combustible, aditivos y otros insumos del ticket.
      </p>
    </ArchonField>
  );
}

interface AdditivesChecklistProps {
  readonly checked: boolean;
  readonly onChange: (v: boolean) => void;
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
  readonly tireData: Record<string, string>;
  readonly onUpdateTire: (pos: string, val: string) => void;
}

/** Campos de presión de neumáticos por posición (FC163 F2B5). */
function TirePressureFields({
  tireData,
  onUpdateTire,
}: TirePressureFieldsProps): React.JSX.Element {
  return (
    <ArchonField label="Presión de Neumáticos (PSI)" icon={Gauge}>
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
    </ArchonField>
  );
}

interface ObservationsFieldProps {
  readonly value: string;
  readonly onChange: (v: string) => void;
}

/** Campo de observaciones de la misión (FC163 F2B5). */
function ObservationsField({ value, onChange }: ObservationsFieldProps): React.JSX.Element {
  return (
    <div className="pt-4 border-t border-[#0f2a44]/5">
      <ArchonField label="Observaciones de la misión" icon={MessageSquare}>
        <textarea
          id="route-closure-observations"
          rows={3}
          placeholder="Observaciones de la misión..."
          value={value}
          onChange={(e): void => onChange(e.target.value)}
          className="w-full bg-white border-2 border-[#0f2a44]/5 focus:border-[#f2b705] p-3 text-xs font-bold text-[#0f2a44] outline-none transition-colors resize-none rounded-[4px] disabled:opacity-50"
        />
      </ArchonField>
    </div>
  );
}

interface ForensicChecklistSectionProps {
  readonly additivesCheck: boolean;
  readonly onAdditivesChange: (v: boolean) => void;
  readonly tireData: Record<string, string>;
  readonly onUpdateTire: (pos: string, val: string) => void;
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
  readonly fuelImages: string[];
  readonly onChange: (imgs: string[]) => void;
}

/** Sección de captura de evidencia fotográfica del ticket de combustible (FC163 F2B5). */
function FuelEvidenceSection({
  fuelImages,
  onChange,
}: FuelEvidenceSectionProps): React.JSX.Element {
  return (
    <ArchonField label="Ticket de Combustible (Evidencia)" icon={ImageIcon}>
      <ArchonImageUploader
        images={fuelImages}
        onChange={onChange}
        title="Capturar Ticket"
        maxImages={4}
        reducedHeight={true}
      />
    </ArchonField>
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

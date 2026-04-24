import React from 'react';
import {
  ShieldCheck,
  Zap,
  Truck,
  Activity,
  Settings,
  Calendar,
  FileText,
  Tag,
  MapPin,
  Wrench,
  Gauge,
  PlusCircle,
  Save,
  Cpu,
  Layers,
} from 'lucide-react';
import ArchonField from '../ArchonField';
import ArchonSelect from '../ArchonSelect';
import ArchonDatePicker from '../ArchonDatePicker';
import ArchonImageUploader from '../ArchonImageUploader';
import ArchonFeedbackBanner from '../ArchonFeedbackBanner';
import { calculateMaintForecast } from '../../utils/fleetPredictiveEngine';
import { COLORES } from '../../constants/fleetConstants';
import {
  CentroMantenimiento,
  MaintenanceFrequency,
  UseFleetFormReturn,
  CatalogOption,
  CreateFleetUnit,
} from '../../types/fleet';

/**
 * 🔱 Archon Alpha v.37.2.0 - "2x2 AXIAL ARCHITECTURE"
 * Rebuilt to eliminate pronounced border radii and strictly enforce
 * the Industrial 2x2 symmetry identical to the Personnel Registry.
 */

interface FleetRegistrationFormProps {
  controller: UseFleetFormReturn;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
}

const getPronosticoArchon = (
  formData: CreateFleetUnit,
  freqUsage: CatalogOption[]
): {
  pronosticoText: string;
  pronosticoDateStr: string;
  isPronosticoReady: boolean;
} => {
  let pronosticoText = 'A la espera de métricas operativas...';
  let pronosticoDateStr = '-- / -- / ----';
  let isPronosticoReady = false;

  if (
    formData.lastServiceDate &&
    formData.maintenanceUsageFreqId &&
    formData.dailyUsageAvg &&
    formData.dailyUsageAvg > 0
  ) {
    const usageLimitOption = freqUsage.find((u) => u.id === formData.maintenanceUsageFreqId);
    const intServi = usageLimitOption
      ? parseInt(usageLimitOption.label.replace(/[^0-9]/g, ''), 10)
      : 0;

    const intervalMap: Record<MaintenanceFrequency, number> = {
      Diaria: 1,
      Semanal: 7,
      Mensual: 30,
      Bimestral: 60,
      Trimestral: 90,
      Semestral: 180,
      Anual: 365,
    };
    const intDias = intervalMap[formData.maintenanceFrequency] || 0;

    if (intServi > 0 && intDias > 0 && formData.lastServiceReading !== undefined) {
      const forecast = calculateMaintForecast(
        intDias,
        intServi,
        formData.dailyUsageAvg || 0,
        formData.odometer,
        formData.lastServiceReading,
        formData.lastServiceDate
      );

      if (forecast) {
        pronosticoDateStr = forecast.forecastDate.toLocaleDateString('es-MX', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const motivo =
          forecast.serviceByKmDate < forecast.serviceByTimeDate ? 'Kilometraje' : 'Tiempo';
        pronosticoText = `Vencimiento proyectado por límite de ${motivo}.`;
        isPronosticoReady = true;
      }
    }
  }

  return { pronosticoText, pronosticoDateStr, isPronosticoReady };
};

const FleetRegistrationForm: React.FC<FleetRegistrationFormProps> = ({
  controller,
  onSuccess,
  onCancel,
}: FleetRegistrationFormProps): React.JSX.Element => {
  const {
    formData,
    error,
    resetError,
    setFormData,
    isSubmitting,
    isLoading,
    assetTypes,
    fuelTypes,
    driveTypes,
    transmissionTypes,
    availableMarcas,
    availableModelos,
    handleAssetTypeChange,
    handleMarcaChange,
    handleModeloChange,
    handleSubmit,
    freqTime,
    freqUsage,
    departments,
    locations,
    useTypes,
    engineTypes,
  } = controller;

  const canSubmit = Boolean(
    formData.assetTypeId &&
      formData.marcaId &&
      formData.modeloId &&
      formData.year &&
      formData.year >= 1990 &&
      formData.id &&
      formData.id.trim() !== '' &&
      formData.uso &&
      formData.departamento &&
      formData.dailyUsageAvg != null &&
      formData.dailyUsageAvg > 0
  );

  const { pronosticoText, pronosticoDateStr, isPronosticoReady } = getPronosticoArchon(
    formData,
    freqUsage
  );

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    try {
      await handleSubmit(e, onSuccess);
    } catch (err: unknown) {
      // Logic handled by hook state
    }
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-[1700px] mx-auto pb-40 space-y-8"
    >
      <ArchonFeedbackBanner message={error || ''} type="error" onClear={resetError} />

      {/* ── 2x2 PANEL ARCHITECTURE ─────────────────────────────────────── */}
      <div className="archon-grid-2 items-start gap-8">
        {/* PANEL 1: MOTOR DE JERARQUÍA (Top-Left) */}
        <div
          className="glass-card-pro bg-white p-10 space-y-8 relative overflow-hidden"
          style={{ borderTop: '4px solid #f2b705' }}
        >
          <div className="archon-card-header-pro">
            <Layers className="text-yellow-500" size={24} />
            <h3 className="text-navy-900 font-bold uppercase tracking-wider text-lg">
              Motor de Jerarquía
            </h3>
          </div>

          <div className="space-y-6 relative z-10">
            <ArchonField label="1. Tipo de Activo" icon={Zap} required>
              <ArchonSelect
                options={assetTypes.map((t: CatalogOption) => ({
                  value: t.id.toString(),
                  label: t.label,
                }))}
                value={formData.assetTypeId?.toString() || ''}
                onChange={(val: string): void => handleAssetTypeChange(parseInt(val, 10))}
              />
            </ArchonField>

            <ArchonField label="2. Identidad de Marca" icon={Truck} required>
              <ArchonSelect
                disabled={!formData.assetTypeId}
                options={availableMarcas}
                placeholder={isLoading ? 'Sincronizando...' : 'Seleccionar marca...'}
                value={formData.marcaId || ''}
                onChange={(val: string): void => handleMarcaChange(val)}
              />
            </ArchonField>

            <ArchonField label="3. Especificación de Modelo" icon={Settings} required>
              <ArchonSelect
                disabled={!formData.marcaId}
                options={availableModelos}
                placeholder={isLoading ? 'Sincronizando...' : 'Seleccionar modelo...'}
                value={formData.modeloId || ''}
                onChange={(val: string): void => handleModeloChange(val)}
              />
            </ArchonField>
          </div>
        </div>

        {/* PANEL 2: IDENTIDAD & CUMPLIMIENTO (Top-Right) */}
        <div
          className="glass-card-pro bg-white p-10 space-y-8 relative overflow-hidden"
          style={{ borderTop: '4px solid #0ea5e9' }}
        >
          <div className="archon-card-header-pro">
            <ShieldCheck size={24} className="text-sky-600" />
            <h3 className="text-navy-900 font-bold uppercase tracking-wider text-lg">
              Identidad & Cumplimiento
            </h3>
          </div>

          <div className="space-y-6">
            <ArchonField label="Número Económico (ID Único)" icon={Tag} required>
              <input
                required
                type="text"
                placeholder="Ej: VEH-001"
                className="archon-input font-bold text-lg tracking-widest text-sky-800"
                value={formData.id}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                  setFormData({ ...formData, id: e.target.value })
                }
              />
            </ArchonField>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Placas / Matrícula" icon={Tag}>
                <input
                  type="text"
                  className="archon-input uppercase font-mono"
                  value={formData.placas}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                    setFormData({ ...formData, placas: e.target.value.toUpperCase() })
                  }
                />
              </ArchonField>
              <ArchonField label="Número de Serie / VIN" icon={ShieldCheck}>
                <input
                  type="text"
                  className="archon-input font-mono"
                  value={formData.numeroSerie}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                    setFormData({ ...formData, numeroSerie: e.target.value })
                  }
                />
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Uso Operativo" icon={Activity} required>
                <ArchonSelect
                  options={useTypes}
                  value={formData.uso ?? ''}
                  onChange={(val: string): void => setFormData({ ...formData, uso: val })}
                />
              </ArchonField>
              <ArchonField label="Departamento Responsable" icon={Wrench} required>
                <ArchonSelect
                  options={departments}
                  value={formData.departamento ?? ''}
                  onChange={(val: string): void => setFormData({ ...formData, departamento: val })}
                />
              </ArchonField>
            </div>

            <ArchonField label="Evidencia Fotográfica" icon={PlusCircle}>
              <ArchonImageUploader
                images={formData.images ?? []}
                onChange={(imgs: string[]): void => setFormData({ ...formData, images: imgs })}
                maxImages={4}
              />
            </ArchonField>
          </div>
        </div>

        {/* PANEL 3: PERFIL TÉCNICO DE LA UNIDAD (Bottom-Left) */}
        <div
          className="glass-card-pro bg-white p-10 space-y-8"
          style={{ borderTop: '4px solid #0f2a44' }}
        >
          <div className="archon-card-header-pro">
            <Cpu size={24} className="text-navy-700" />
            <h3 className="text-navy-900 font-bold uppercase tracking-wider text-lg">
              Perfil Técnico de la Unidad
            </h3>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Año de Fabricación" icon={Calendar} required>
                <input
                  required
                  type="number"
                  min={1990}
                  max={2030}
                  className="archon-input font-mono"
                  value={formData.year}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                    setFormData({ ...formData, year: parseInt(e.target.value, 10) })
                  }
                />
              </ArchonField>
              <ArchonField label="Color Dominante" icon={Activity}>
                <ArchonSelect
                  options={COLORES}
                  value={formData.color ?? ''}
                  onChange={(val: string): void => setFormData({ ...formData, color: val })}
                />
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Tracción / Drive" icon={Gauge}>
                <ArchonSelect
                  options={driveTypes.map((t) => ({ value: t.id.toString(), label: t.label }))}
                  value={formData.traccionId?.toString() || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, traccionId: parseInt(val, 10) })
                  }
                />
              </ArchonField>
              <ArchonField label="Transmisión" icon={Settings}>
                <ArchonSelect
                  options={transmissionTypes.map((t) => ({
                    value: t.id.toString(),
                    label: t.label,
                  }))}
                  value={formData.transmisionId?.toString() || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, transmisionId: parseInt(val, 10) })
                  }
                />
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Configuración de Motor" icon={Activity}>
                <ArchonSelect
                  options={engineTypes}
                  value={formData.motor ?? ''}
                  onChange={(val: string): void => setFormData({ ...formData, motor: val })}
                />
              </ArchonField>
              <ArchonField label="Combustible" icon={Zap}>
                <ArchonSelect
                  options={fuelTypes.map((t) => ({ value: t.id.toString(), label: t.label }))}
                  value={formData.fuelTypeId?.toString() || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, fuelTypeId: parseInt(val, 10) })
                  }
                />
              </ArchonField>
            </div>

            <ArchonField label="Notas Técnicas de Fábrica" icon={FileText}>
              <textarea
                placeholder="Ingresar especificaciones críticas de este activo..."
                className="archon-input min-h-[100px] p-4 resize-none leading-relaxed"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </ArchonField>
          </div>
        </div>

        {/* PANEL 4: LOGÍSTICA ESTRATÉGICA & MANTENIMIENTO (Bottom-Right) */}
        <div
          className="glass-card-pro bg-white p-10 space-y-8"
          style={{ borderTop: '4px solid #64748b' }}
        >
          <div className="archon-card-header-pro">
            <MapPin size={24} className="text-slate-500" />
            <h3 className="text-navy-900 font-bold uppercase tracking-wider text-lg">
              Logística Estratégica & Mto.
            </h3>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Sede de Operación" icon={MapPin}>
                <ArchonSelect
                  options={locations}
                  value={formData.sede ?? ''}
                  onChange={(val: string): void => setFormData({ ...formData, sede: val })}
                />
              </ArchonField>

              <ArchonField label="Horómetro / Odómetro" icon={Gauge}>
                <input
                  type="number"
                  className="archon-input font-mono text-center text-navy-800"
                  value={formData.odometer}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                    setFormData({ ...formData, odometer: parseInt(e.target.value, 10) })
                  }
                />
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Ciclo Mto. (Fec.)" icon={Calendar}>
                <ArchonSelect
                  options={freqTime}
                  value={formData.maintenanceFrequency}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, maintenanceFrequency: val as MaintenanceFrequency })
                  }
                />
              </ArchonField>

              <ArchonField label="Ciclo Mto. (Uso)" icon={Activity}>
                <ArchonSelect
                  options={freqUsage.map((u) => ({ value: u.id.toString(), label: u.label }))}
                  value={formData.maintenanceUsageFreqId?.toString() || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, maintenanceUsageFreqId: parseInt(val, 10) })
                  }
                />
              </ArchonField>
            </div>

            <ArchonField label="Centro de Gestión Autorizado" icon={Settings}>
              <ArchonSelect
                options={['PIIC', 'Archon Core']}
                value={formData.centroMantenimiento}
                onChange={(val: string): void =>
                  setFormData({ ...formData, centroMantenimiento: val as CentroMantenimiento })
                }
              />
            </ArchonField>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Fecha Último Servicio" icon={Calendar}>
                <ArchonDatePicker
                  value={formData.lastServiceDate ?? ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, lastServiceDate: val })
                  }
                />
              </ArchonField>
              <ArchonField label="Lectura de Servicio" icon={Gauge}>
                <input
                  type="number"
                  className="archon-input font-mono text-center"
                  value={formData.lastServiceReading}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                    setFormData({ ...formData, lastServiceReading: parseInt(e.target.value, 10) })
                  }
                />
              </ArchonField>
            </div>

            <ArchonField label="Uso Promedio Diario (Km/Hr)" icon={Activity}>
              <input
                type="number"
                step="0.1"
                className="archon-input font-mono text-center text-emerald-700 font-bold"
                value={formData.dailyUsageAvg || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                  setFormData({ ...formData, dailyUsageAvg: parseFloat(e.target.value) || 0 })
                }
              />
            </ArchonField>

            {/* 🔮 WOW CARD: PRONÓSTICO ARCHON */}
            <div
              className={`mt-6 p-5 rounded border ${
                isPronosticoReady ? 'bg-navy-900 border-navy-700' : 'bg-slate-100 border-slate-200'
              } transition-colors duration-500`}
            >
              <div className="flex items-center gap-3">
                <Zap
                  className={isPronosticoReady ? 'text-yellow-400' : 'text-slate-400'}
                  size={20}
                />
                <div>
                  <h4
                    className={`text-xs font-black uppercase tracking-widest ${
                      isPronosticoReady ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    PRONÓSTICO AUTOMÁTICO
                  </h4>
                  {isPronosticoReady ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-2xl font-black text-rose-500 tracking-tight">
                        {pronosticoDateStr}
                      </p>
                      <p className="text-xs text-slate-400 font-medium">{pronosticoText}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 font-medium">{pronosticoText}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="archon-grid-2 mt-8">
        <div />
        <div className="grid grid-cols-2 gap-6">
          <button
            type="button"
            onClick={onCancel}
            className="btn-sentinel-red w-full uppercase font-black text-[11px] tracking-widest rounded-[4px]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className={`btn-sentinel-emerald w-full uppercase font-black text-[11px] tracking-widest flex items-center justify-center gap-2 rounded-[4px] transition-all duration-300 ${
              !canSubmit || isSubmitting ? 'opacity-50 grayscale cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Transmitiendo...' : 'Confirmar Alta'}
            <Save size={16} />
          </button>
        </div>
      </div>
    </form>
  );
};

export default FleetRegistrationForm;

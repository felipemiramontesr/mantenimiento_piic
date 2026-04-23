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
  ChevronRight,
  Database,
} from 'lucide-react';
import ArchonField from '../ArchonField';
import ArchonSelect from '../ArchonSelect';
import ArchonDatePicker from '../ArchonDatePicker';
import ArchonImageUploader from '../ArchonImageUploader';
import ArchonFeedbackBanner from '../ArchonFeedbackBanner';
import { COLORES } from '../../constants/fleetConstants';
import {
  CentroMantenimiento,
  MaintenanceFrequency,
  UseFleetFormReturn,
  CatalogOption,
} from '../../types/fleet';

/**
 * 🔱 Archon Alpha v.37.0.0 - "THE AXIAL CASCADE"
 * Rebuilt from scratch to enforce strict Database-Driven Hierarchy.
 * Design Standard: Industrial Sovereign (Pillar 2).
 */

interface FleetRegistrationFormProps {
  controller: UseFleetFormReturn;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
}

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

      {/* ── STAGE 0: PURE CASCADE ENGINE ──────────────────────────────────── */}
      <div
        className="glass-card-pro bg-white p-12 space-y-10 relative overflow-hidden"
        style={{ borderLeft: '8px solid #f2b705' }}
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Database size={200} />
        </div>

        <div className="flex items-center space-x-4 mb-2">
          <Layers className="text-yellow-500" size={28} />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-navy-900 uppercase">
              Motor de Jerarquía
            </h2>
            <p className="text-slate-500 text-sm">
              Sincronización determinista de activos en tiempo real.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
          {/* STEP 1: ASSET TYPE */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-yellow-600 font-semibold text-xs uppercase tracking-widest">
              <span className="bg-yellow-100 w-6 h-6 flex items-center justify-center rounded-full">
                1
              </span>
              <span>Clasificación Primaria</span>
            </div>
            <ArchonField label="Tipo de Activo" icon={Zap} required>
              <ArchonSelect
                options={assetTypes.map((t: CatalogOption) => ({
                  value: t.id.toString(),
                  label: t.label,
                }))}
                value={formData.assetTypeId?.toString() || ''}
                onChange={(val: string): void => handleAssetTypeChange(parseInt(val, 10))}
              />
            </ArchonField>
          </div>

          <div className="hidden md:flex items-center justify-center translate-y-4">
            <ChevronRight className="text-slate-200" size={40} />
          </div>

          {/* STEP 2: BRAND */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-yellow-600 font-semibold text-xs uppercase tracking-widest">
              <span className="bg-yellow-100 w-6 h-6 flex items-center justify-center rounded-full">
                2
              </span>
              <span>Identidad de Marca</span>
            </div>
            <ArchonField label="Marca" icon={Truck} required>
              <ArchonSelect
                disabled={!formData.assetTypeId}
                options={availableMarcas}
                placeholder={isLoading ? 'Sincronizando...' : 'Seleccionar marca...'}
                value={formData.marcaId || ''}
                onChange={(val: string): void => handleMarcaChange(val)}
              />
            </ArchonField>
          </div>

          <div className="hidden md:flex items-center justify-center translate-y-4">
            <ChevronRight className="text-slate-200" size={40} />
          </div>

          {/* STEP 3: MODEL */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-yellow-600 font-semibold text-xs uppercase tracking-widest">
              <span className="bg-yellow-100 w-6 h-6 flex items-center justify-center rounded-full">
                3
              </span>
              <span>Especificación de Modelo</span>
            </div>
            <ArchonField label="Modelo" icon={Settings} required>
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
      </div>

      <div className="archon-grid-2">
        {/* ── STAGE 1: TECHNICAL DNA ───────────────────────────────────────── */}
        <div
          className="glass-card-pro bg-white p-10 space-y-8"
          style={{ borderTop: '4px solid #0f2a44' }}
        >
          <div className="archon-card-header-pro">
            <Cpu size={22} className="text-navy-700" />
            <h3 className="text-navy-900 font-bold uppercase tracking-wider">
              Perfil Técnico de la Unidad
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-8">
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

          <div className="grid grid-cols-2 gap-8">
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
                options={transmissionTypes.map((t) => ({ value: t.id.toString(), label: t.label }))}
                value={formData.transmisionId?.toString() || ''}
                onChange={(val: string): void =>
                  setFormData({ ...formData, transmisionId: parseInt(val, 10) })
                }
              />
            </ArchonField>
          </div>

          <div className="grid grid-cols-2 gap-8">
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

          <div className="pt-4">
            <ArchonField label="Notas Técnicas de Fábrica" icon={FileText}>
              <textarea
                placeholder="Ingresar especificaciones críticas de este activo..."
                className="archon-input min-h-[120px] p-4 resize-none leading-relaxed"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </ArchonField>
          </div>
        </div>

        {/* ── STAGE 2: IDENTITY & COMPLIANCE ────────────────────────────────── */}
        <div
          className="glass-card-pro bg-white p-10 space-y-8"
          style={{ borderTop: '4px solid #0ea5e9' }}
        >
          <div className="archon-card-header-pro">
            <ShieldCheck size={22} className="text-sky-600" />
            <h3 className="text-navy-900 font-bold uppercase tracking-wider">
              Identidad & Cumplimiento
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-8">
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
          </div>

          <div className="grid grid-cols-2 gap-8">
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

          <div className="grid grid-cols-2 gap-8">
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

      {/* ── STAGE 3: LOGISTICS & STRATEGY ─────────────────────────────────── */}
      <div
        className="glass-card-pro bg-white p-10 space-y-8"
        style={{ borderTop: '4px solid #64748b' }}
      >
        <div className="archon-card-header-pro">
          <MapPin size={22} className="text-slate-500" />
          <h3 className="text-navy-900 font-bold uppercase tracking-wider">
            Logística Estratégica & Mantenimiento
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <ArchonField label="Sede de Operación" icon={MapPin}>
            <ArchonSelect
              options={locations}
              value={formData.sede ?? ''}
              onChange={(val: string): void => setFormData({ ...formData, sede: val })}
            />
          </ArchonField>

          <ArchonField label="Kilometraje / Horas Actual" icon={Gauge}>
            <input
              type="number"
              className="archon-input font-mono text-center text-navy-800"
              value={formData.odometer}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                setFormData({ ...formData, odometer: parseInt(e.target.value, 10) })
              }
            />
          </ArchonField>

          <ArchonField label="Plan Mantenimiento (Tiempo)" icon={Calendar}>
            <ArchonSelect
              options={freqTime}
              value={formData.maintenanceFrequency}
              onChange={(val: string): void =>
                setFormData({ ...formData, maintenanceFrequency: val as MaintenanceFrequency })
              }
            />
          </ArchonField>

          <ArchonField label="Plan Mantenimiento (Uso)" icon={Activity}>
            <ArchonSelect
              options={freqUsage.map((u) => ({ value: u.id.toString(), label: u.label }))}
              value={formData.maintenanceUsageFreqId?.toString() || ''}
              onChange={(val: string): void =>
                setFormData({ ...formData, maintenanceUsageFreqId: parseInt(val, 10) })
              }
            />
          </ArchonField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
          <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <ArchonField label="Centro de Gestión" icon={Settings}>
              <ArchonSelect
                options={['PIIC', 'Archon Core']}
                value={formData.centroMantenimiento}
                onChange={(val: string): void =>
                  setFormData({ ...formData, centroMantenimiento: val as CentroMantenimiento })
                }
              />
            </ArchonField>
          </div>
          <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <ArchonField label="Fecha Último Servicio" icon={Calendar}>
              <ArchonDatePicker
                value={formData.lastServiceDate ?? ''}
                onChange={(val: string): void => setFormData({ ...formData, lastServiceDate: val })}
              />
            </ArchonField>
          </div>
          <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <ArchonField label="Lectura Último Servicio" icon={Gauge}>
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
        </div>
      </div>

      <div className="flex justify-between items-center pt-8">
        <button
          type="button"
          onClick={onCancel}
          className="px-10 py-5 rounded-2xl font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all duration-300 active:scale-95 uppercase tracking-widest text-xs"
        >
          Anular Operación
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-14 py-5 rounded-2xl font-bold bg-navy-900 text-white hover:bg-navy-800 shadow-2xl shadow-navy-200 transition-all duration-300 active:scale-95 flex items-center uppercase tracking-widest text-xs"
        >
          {isSubmitting ? 'Transmitiendo ADN...' : 'Registrar en Flotilla Central'}
          <Save size={18} className="ml-3 text-yellow-400" />
        </button>
      </div>
    </form>
  );
};

export default FleetRegistrationForm;

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
 * 🔱 Archon Alpha v.37.2.0 - "2x2 AXIAL ARCHITECTURE"
 * Rebuilt to eliminate pronounced border radii and strictly enforce
 * the Industrial 2x2 symmetry identical to the Personnel Registry.
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

      {/* ── 2x2 PANEL ARCHITECTURE ─────────────────────────────────────── */}
      <div className="archon-grid-2 items-start gap-8">
        {/* PANEL 1: MOTOR DE JERARQUÍA (Top-Left) */}
        <div
          className="glass-card-pro bg-white p-10 space-y-8 relative overflow-hidden"
          style={{ borderTop: '4px solid #f2b705' }}
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Database size={200} />
          </div>

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

            <div className="p-5 bg-slate-50 rounded border border-dashed border-slate-300">
              <ArchonField label="Centro de Gestión Autorizado" icon={Settings}>
                <ArchonSelect
                  options={['PIIC', 'Archon Core']}
                  value={formData.centroMantenimiento}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, centroMantenimiento: val as CentroMantenimiento })
                  }
                />
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-5 bg-slate-50 rounded border border-dashed border-slate-300">
                <ArchonField label="Fecha Último Servicio" icon={Calendar}>
                  <ArchonDatePicker
                    value={formData.lastServiceDate ?? ''}
                    onChange={(val: string): void =>
                      setFormData({ ...formData, lastServiceDate: val })
                    }
                  />
                </ArchonField>
              </div>
              <div className="p-5 bg-slate-50 rounded border border-dashed border-slate-300">
                <ArchonField label="Lectura de Servicio" icon={Gauge}>
                  <input
                    type="number"
                    className="archon-input font-mono text-center"
                    value={formData.lastServiceReading}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                    ): void =>
                      setFormData({ ...formData, lastServiceReading: parseInt(e.target.value, 10) })
                    }
                  />
                </ArchonField>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-8 border-t border-slate-200 mt-8">
        <button
          type="button"
          onClick={onCancel}
          className="px-10 py-4 rounded font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all duration-300 active:scale-95 uppercase tracking-widest text-xs"
        >
          Anular Operación
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-14 py-4 rounded font-bold bg-navy-900 text-white hover:bg-navy-800 shadow-xl shadow-navy-200 transition-all duration-300 active:scale-95 flex items-center uppercase tracking-widest text-xs"
        >
          {isSubmitting ? 'Transmitiendo ADN...' : 'Registrar en Flotilla Central'}
          <Save size={18} className="ml-3 text-yellow-400" />
        </button>
      </div>
    </form>
  );
};

export default FleetRegistrationForm;

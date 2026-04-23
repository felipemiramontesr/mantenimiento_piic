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
  Map,
  Wrench,
  Gauge,
  PlusCircle,
  Save,
} from 'lucide-react';
import ArchonField from '../ArchonField';
import ArchonSelect from '../ArchonSelect';
import ArchonDatePicker from '../ArchonDatePicker';
import ArchonImageUploader from '../ArchonImageUploader';
import ArchonFeedbackBanner from '../ArchonFeedbackBanner';
import { USO_OPTIONS, MARCAS_NEUMATICOS, SEDES, COLORES } from '../../constants/fleetConstants';
import {
  CentroMantenimiento,
  MaintenanceFrequency,
  UseFleetFormReturn,
  CatalogOption,
} from '../../types/fleet';

/**
 * 🔱 Archon Component: FleetRegistrationForm
 * Implementation: Silicon Valley Standard (SRP/DRY/SOLID)
 * v.17.0.0 Refined - Now accepts hook state as props for synchronization
 */

interface FleetRegistrationFormProps {
  // Hook-derived props (DIP)
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
    assetTypes,
    fuelTypes,
    driveTypes,
    transmissionTypes,
    availableMarcas,
    availableModelos,
    handleAssetTypeChange,
    handleMarcaChange,
    handleSubmit,
    freqTime,
    freqUsage,
    departments,
  } = controller;

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    try {
      await handleSubmit(e, onSuccess);
    } catch (err: unknown) {
      // Error is now handled by the hook state and displayed via ArchonFeedbackBanner
    }
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-[1600px] mx-auto pb-40 space-y-6 transition-all duration-300 ease-in-out"
    >
      <ArchonFeedbackBanner message={error || ''} type="error" onClear={resetError} />
      <div className="archon-grid-2">
        {/* ── SECTION: Clasificación del Activo ─────────────────────────────── */}
        <div
          className="glass-card-pro card-hover-yellow bg-white p-10 space-y-8 flex flex-col"
          style={{ borderTop: '4px solid #f2b705' }}
        >
          <div className="archon-card-header-pro">
            <ShieldCheck size={22} />
            <h3>Clasificación del Activo</h3>
          </div>

          <div className="grid grid-cols-2 gap-8">
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

            <ArchonField label="Marca" icon={Truck} required>
              <ArchonSelect
                options={availableMarcas}
                value={formData.marca}
                onChange={(val: string): void => handleMarcaChange(val)}
              />
            </ArchonField>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <ArchonField label="Color" icon={Activity}>
              <ArchonSelect
                options={COLORES}
                value={formData.color ?? ''}
                onChange={(val: string): void => setFormData({ ...formData, color: val })}
              />
            </ArchonField>

            <ArchonField label="Modelo" icon={Settings} required>
              <ArchonSelect
                options={availableModelos}
                value={formData.modelo}
                onChange={(val: string): void => setFormData({ ...formData, modelo: val })}
              />
            </ArchonField>
          </div>

          <ArchonField label="Año" icon={Calendar} required>
            <input
              required
              type="number"
              className="archon-input"
              value={formData.year}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData({ ...formData, year: parseInt(e.target.value, 10) })
              }
            />
          </ArchonField>

          <div className="flex-grow flex flex-col pt-4">
            <ArchonField label="Descripción Técnia / Notas" icon={FileText}>
              <textarea
                placeholder="Especificaciones adicionales..."
                className="archon-input min-h-[140px] p-4 resize-none leading-relaxed"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </ArchonField>
          </div>
        </div>

        {/* ── SECTION: Identidad del Activo ─────────────────────────────────── */}
        <div
          className="glass-card-pro card-hover-navy bg-white p-10 space-y-8"
          style={{ borderTop: '4px solid #0f2a44' }}
        >
          <div className="archon-card-header-pro">
            <FileText size={22} />
            <h3>Identidad del Activo</h3>
          </div>

          <ArchonField label="Número Económico" icon={Tag} required>
            <input
              required
              type="text"
              placeholder="Ej. ASM-001"
              className="archon-input"
              value={formData.id}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData({ ...formData, id: e.target.value })
              }
            />
          </ArchonField>

          <div className="grid grid-cols-2 gap-8">
            <ArchonField label="Uso Específico" icon={Map} required>
              <ArchonSelect
                options={USO_OPTIONS}
                value={formData.uso ?? ''}
                onChange={(val: string): void => setFormData({ ...formData, uso: val })}
              />
            </ArchonField>
            <ArchonField label="Departamento" icon={Wrench} required>
              <ArchonSelect
                options={departments}
                value={formData.departamento ?? ''}
                onChange={(val: string): void => setFormData({ ...formData, departamento: val })}
              />
            </ArchonField>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <ArchonField label="Placas" icon={Tag}>
              <input
                type="text"
                placeholder="Ej. ZH-3153-B"
                className="archon-input"
                value={formData.placas}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, placas: e.target.value })
                }
              />
            </ArchonField>
            <ArchonField label="Número de Serie / VIN" icon={ShieldCheck}>
              <input
                type="text"
                placeholder="Serial Number"
                className="archon-input"
                value={formData.numeroSerie}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, numeroSerie: e.target.value })
                }
              />
            </ArchonField>
          </div>

          <ArchonField label="Fotografías de Identidad" icon={PlusCircle}>
            <ArchonImageUploader
              images={formData.images ?? []}
              onChange={(imgs: string[]): void => setFormData({ ...formData, images: imgs })}
              maxImages={4}
            />
          </ArchonField>
        </div>
      </div>

      {/* ── ROW 2: Configuración Mecánica + Operación ─────────────────────── */}
      <div className="archon-grid-2">
        {/* CARD: Configuración Mecánica */}
        <div
          className="glass-card-pro card-hover-sky bg-white p-10 space-y-8"
          style={{ borderTop: '4px solid #0ea5e9' }}
        >
          <div className="archon-card-header-pro">
            <Settings size={22} />
            <h3>Configuración Mecánica</h3>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <ArchonField label="Tracción" icon={Activity}>
              <ArchonSelect
                options={driveTypes.map((t: CatalogOption) => ({
                  value: t.id.toString(),
                  label: t.label,
                }))}
                value={formData.traccionId?.toString() || ''}
                onChange={(val: string): void =>
                  setFormData({ ...formData, traccionId: parseInt(val, 10) })
                }
              />
            </ArchonField>
            <ArchonField label="Transmisión" icon={Settings}>
              <ArchonSelect
                options={transmissionTypes.map((t: CatalogOption) => ({
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

          <div className="grid grid-cols-2 gap-8">
            <ArchonField label="Tipo de Combustible" icon={Zap}>
              <ArchonSelect
                options={fuelTypes.map((t: CatalogOption) => ({
                  value: t.id.toString(),
                  label: t.label,
                }))}
                value={formData.fuelTypeId?.toString() || ''}
                onChange={(val: string): void =>
                  setFormData({ ...formData, fuelTypeId: parseInt(val, 10) })
                }
              />
            </ArchonField>
            <ArchonField label="Motor" icon={Activity}>
              <input
                type="text"
                placeholder="Ej. 2.5L Turbo"
                className="archon-input"
                value={formData.motor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, motor: e.target.value })
                }
              />
            </ArchonField>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <ArchonField label="Especificación Neumáticos" icon={Gauge}>
              <input
                type="text"
                placeholder="Ej. 255/70 R17"
                className="archon-input"
                value={formData.tireSpec}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, tireSpec: e.target.value })
                }
              />
            </ArchonField>
            <ArchonField label="Marca Neumáticos" icon={ShieldCheck}>
              <ArchonSelect
                options={MARCAS_NEUMATICOS}
                value={formData.tireBrand ?? ''}
                onChange={(val: string): void => setFormData({ ...formData, tireBrand: val })}
              />
            </ArchonField>
          </div>
        </div>

        {/* CARD: Gestión Operativa & Compliance */}
        <div
          className="glass-card-pro card-hover-navy bg-white p-10 space-y-8"
          style={{ borderTop: '4px solid #0f2a44' }}
        >
          <div className="archon-card-header-pro">
            <ShieldCheck size={22} />
            <h3>Gestión & Cumplimiento</h3>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <ArchonField label="Sede de Operación" icon={MapPin}>
              <ArchonSelect
                options={SEDES}
                value={formData.sede ?? ''}
                onChange={(val: string): void => setFormData({ ...formData, sede: val })}
              />
            </ArchonField>
            <ArchonField label="Frecuencia (Tiempo)" icon={Calendar}>
              <ArchonSelect
                options={freqTime}
                value={formData.maintenanceFrequency}
                onChange={(val: string): void =>
                  setFormData({ ...formData, maintenanceFrequency: val as MaintenanceFrequency })
                }
              />
            </ArchonField>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <ArchonField label="Frecuencia (Uso/Predictivo)" icon={Activity}>
              <ArchonSelect
                options={freqUsage.map((u) => ({
                  value: u.id.toString(),
                  label: u.label,
                }))}
                value={formData.maintenanceUsageFreqId?.toString() || ''}
                onChange={(val: string): void =>
                  setFormData({ ...formData, maintenanceUsageFreqId: parseInt(val, 10) })
                }
              />
            </ArchonField>
            <ArchonField label="Kilometraje / Horas Actual" icon={Gauge}>
              <input
                type="number"
                className="archon-input"
                value={formData.odometer}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, odometer: parseInt(e.target.value, 10) })
                }
              />
            </ArchonField>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <ArchonField label="Centro de Mantenimiento" icon={Wrench}>
              <ArchonSelect
                options={['PIIC', 'Archon Core']}
                value={formData.centroMantenimiento}
                onChange={(val: string): void =>
                  setFormData({ ...formData, centroMantenimiento: val as CentroMantenimiento })
                }
              />
            </ArchonField>
            <ArchonField label="Fecha Último Servicio" icon={Calendar}>
              <ArchonDatePicker
                value={formData.lastServiceDate ?? ''}
                onChange={(val: string): void => setFormData({ ...formData, lastServiceDate: val })}
              />
            </ArchonField>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <ArchonField label="Lectura Último Servicio" icon={Activity}>
              <input
                type="number"
                placeholder="Km o Hrs"
                className="archon-input"
                value={formData.lastServiceReading}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({
                    ...formData,
                    lastServiceReading: parseInt(e.target.value, 10),
                  })
                }
              />
            </ArchonField>
            <ArchonField label="Fecha Inicio Protocolo" icon={Calendar}>
              <ArchonDatePicker
                value={formData.protocolStartDate ?? ''}
                onChange={(val: string): void =>
                  setFormData({ ...formData, protocolStartDate: val })
                }
              />
            </ArchonField>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <ArchonField label="Vigencia Seguro" icon={Calendar}>
              <ArchonDatePicker
                value={formData.vigenciaSeguro ?? ''}
                onChange={(val: string): void => setFormData({ ...formData, vigenciaSeguro: val })}
              />
            </ArchonField>
            <ArchonField label="Vencimiento Verificación" icon={Calendar}>
              <ArchonDatePicker
                value={formData.vencimientoVerificacion ?? ''}
                onChange={(val: string): void =>
                  setFormData({ ...formData, vencimientoVerificacion: val })
                }
              />
            </ArchonField>
          </div>
        </div>
      </div>

      <div className="archon-grid-2 pt-12">
        {/* ── LEFT SHROUD: Alignment Placeholder ─────────────────────────── */}
        <div />

        {/* ── RIGHT AXIS: Action Cluster ─────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6">
          <button
            type="button"
            onClick={onCancel}
            className="btn-sentinel-red w-full whitespace-nowrap"
          >
            Cancelar Registro
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-sentinel-emerald w-full whitespace-nowrap"
          >
            {isSubmitting ? 'Transmitiendo...' : 'Confirmar Registro'}
            <Save size={16} className="ml-2" />
          </button>
        </div>
      </div>
    </form>
  );
};

export default FleetRegistrationForm;

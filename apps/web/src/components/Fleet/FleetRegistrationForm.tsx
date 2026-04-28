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
import {
  CentroMantenimiento,
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

const getDaysFromFreqId = (
  freqId: number | null | undefined,
  freqTime: CatalogOption[]
): number => {
  if (!freqId) return 0;
  const timeLimitOption = freqTime.find((t) => t.id === freqId);
  if (!timeLimitOption) return 0;

  const intervalMap: Record<string, number> = {
    Diaria: 1,
    Semanal: 7,
    Mensual: 30,
    Bimestral: 60,
    Trimestral: 90,
    Semestral: 180,
    Anual: 365,
  };
  return intervalMap[timeLimitOption.label] || 0;
};

const getPronosticoArchon = (
  formData: CreateFleetUnit,
  freqTime: CatalogOption[],
  freqUsage: CatalogOption[]
): {
  pronosticoText: string;
  pronosticoDateStr: string;
  isPronosticoReady: boolean;
} => {
  const result = {
    pronosticoText: 'A la espera de fecha de servicio y métricas...',
    pronosticoDateStr: '-- / -- / ----',
    isPronosticoReady: false,
  };

  if (!formData.lastServiceDate || !formData.maintenanceTimeFreqId) return result;

  const intDias = getDaysFromFreqId(formData.maintenanceTimeFreqId, freqTime);
  if (intDias <= 0) return result;

  const hasUsageData =
    formData.maintenanceUsageFreqId &&
    formData.dailyUsageAvg &&
    formData.dailyUsageAvg > 0 &&
    formData.lastServiceReading !== undefined;

  if (hasUsageData) {
    const usageLimitOption = freqUsage.find((u) => u.id === formData.maintenanceUsageFreqId);
    const intServi = usageLimitOption
      ? parseInt(usageLimitOption.label.replace(/[^0-9]/g, ''), 10)
      : 0;

    if (intServi > 0) {
      const forecast = calculateMaintForecast(
        intDias,
        intServi,
        formData.dailyUsageAvg || 0,
        formData.odometer,
        formData.lastServiceReading || 0,
        formData.lastServiceDate
      );

      if (forecast) {
        result.pronosticoDateStr = forecast.forecastDate.toLocaleDateString('es-MX', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const motivo =
          forecast.serviceByKmDate < forecast.serviceByTimeDate ? 'Kilometraje' : 'Tiempo';
        result.pronosticoText = `Vencimiento proyectado por límite de ${motivo}.`;
        result.isPronosticoReady = true;
        return result;
      }
    }
  }

  // 🔱 Fallback Soberano: Proyectar solo por tiempo si no hay uso o la previsión híbrida falla
  const lastDate = new Date(formData.lastServiceDate);
  const forecastDate = new Date(lastDate);
  forecastDate.setDate(forecastDate.getDate() + intDias);

  result.pronosticoDateStr = forecastDate.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  result.pronosticoText = 'Vencimiento proyectado por límite de Tiempo. (Histórico pendiente)';
  result.isPronosticoReady = true;

  return result;
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
    marcas,
    modelos,
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
    formData.brandId &&
      formData.modelId &&
      formData.year &&
      formData.year >= 1990 &&
      formData.id.trim() !== '' &&
      formData.operationalUseId &&
      formData.departmentId &&
      formData.dailyUsageAvg != null &&
      formData.dailyUsageAvg > 0
  );

  const { pronosticoText, pronosticoDateStr, isPronosticoReady } = getPronosticoArchon(
    formData,
    freqTime,
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
          className="glass-card-pro bg-white p-10 space-y-8 relative z-20"
          style={{ borderTop: '4px solid #f2b705' }}
        >
          <div className="archon-card-header-pro">
            <Layers className="text-yellow-500" size={24} />
            <h3 className="text-navy-900 font-bold uppercase tracking-wider text-lg">IDENTIDAD</h3>
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
                options={marcas.map((m: CatalogOption) => ({
                  value: m.id.toString(),
                  label: m.label,
                }))}
                placeholder={isLoading ? 'Sincronizando...' : 'Seleccionar marca...'}
                value={formData.brandId?.toString() || ''}
                onChange={(val: string): void => handleMarcaChange(parseInt(val, 10))}
              />
            </ArchonField>

            <ArchonField label="3. Especificación de Modelo" icon={Settings} required>
              <ArchonSelect
                disabled={!formData.brandId}
                options={modelos.map((m: CatalogOption) => ({
                  value: m.id.toString(),
                  label: m.label,
                }))}
                placeholder={isLoading ? 'Sincronizando...' : 'Seleccionar modelo...'}
                value={formData.modelId?.toString() || ''}
                onChange={(val: string): void => handleModeloChange(parseInt(val, 10))}
              />
            </ArchonField>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Número Económico" icon={Tag} required>
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
              <ArchonField label="Estatus de Propiedad" icon={Layers}>
                <ArchonSelect
                  options={controller.owners.map((o: CatalogOption) => ({
                    value: o.id.toString(),
                    label: o.label,
                  }))}
                  value={formData.ownerId?.toString() || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, ownerId: parseInt(val, 10) })
                  }
                />
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Placas / Matrícula" icon={Tag}>
                <input
                  type="text"
                  placeholder="Ej: XX-1234-A"
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
                  placeholder="Ej: 3VW... (17 caracteres)"
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
                  options={useTypes.map((u: CatalogOption) => ({
                    value: u.id.toString(),
                    label: u.label,
                  }))}
                  value={formData.operationalUseId?.toString() ?? ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, operationalUseId: parseInt(val, 10) })
                  }
                />
              </ArchonField>
              <ArchonField label="Departamento Responsable" icon={Wrench} required>
                <ArchonSelect
                  options={departments.map((d: CatalogOption) => ({
                    value: d.id.toString(),
                    label: d.label,
                  }))}
                  value={formData.departmentId?.toString() ?? ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, departmentId: parseInt(val, 10) })
                  }
                />
              </ArchonField>
            </div>
          </div>
        </div>

        {/* PANEL 2: IDENTIDAD & CUMPLIMIENTO (Top-Right) */}
        <div
          className="glass-card-pro bg-white p-10 space-y-8 relative z-20"
          style={{ borderTop: '4px solid #0ea5e9' }}
        >
          <div className="archon-card-header-pro">
            <ShieldCheck size={24} className="text-sky-600" />
            <h3 className="text-navy-900 font-bold uppercase tracking-wider text-lg">
              CUMPLIMIENTO
            </h3>
          </div>

          <div className="space-y-6">
            <ArchonField label="Estatus Botiquín PA" icon={ShieldCheck}>
              <ArchonSelect
                options={(controller.complianceStatuses || []).map((s: CatalogOption) => ({
                  value: s.id.toString(),
                  label: s.label,
                }))}
                value={formData.complianceStatusId?.toString() || ''}
                onChange={(val: string): void =>
                  setFormData({ ...formData, complianceStatusId: parseInt(val, 10) })
                }
              />
            </ArchonField>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Póliza de Seguro" icon={FileText}>
                <input
                  type="text"
                  placeholder="Ej: POL-2024-XXXX"
                  className="archon-input font-mono"
                  value={formData.insurance_policy_number || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                    setFormData({ ...formData, insurance_policy_number: e.target.value })
                  }
                />
              </ArchonField>
              <ArchonField label="Aseguradora" icon={ShieldCheck}>
                <ArchonSelect
                  options={(controller.insuranceCompanies || []).map((c: CatalogOption) => ({
                    value: c.label,
                    label: c.label,
                  }))}
                  value={formData.insurance_company || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, insurance_company: val })
                  }
                />
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Vigencia Seguro" icon={Calendar}>
                <ArchonDatePicker
                  value={formData.insuranceExpiryDate || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, insuranceExpiryDate: val })
                  }
                />
              </ArchonField>
              <ArchonField label="Folio Tarjeta Circulación" icon={Tag}>
                <input
                  type="text"
                  placeholder="Ej: 123456789"
                  className="archon-input font-mono"
                  value={formData.circulation_card_number || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                    setFormData({ ...formData, circulation_card_number: e.target.value })
                  }
                />
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Cumplimiento Legal (Placas)" icon={Calendar}>
                <ArchonDatePicker
                  value={formData.legalComplianceDate || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, legalComplianceDate: val })
                  }
                />
              </ArchonField>
              <ArchonField label="Verif. Ambiental" icon={Activity}>
                <ArchonDatePicker
                  value={formData.last_environmental_verification || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, last_environmental_verification: val })
                  }
                />
              </ArchonField>
            </div>

            <ArchonField label="Inspección Físico-Mecánica" icon={Settings}>
              <ArchonDatePicker
                value={formData.last_mechanical_verification || ''}
                onChange={(val: string): void =>
                  setFormData({ ...formData, last_mechanical_verification: val })
                }
              />
            </ArchonField>

            {/* 💰 GESTIÓN FINANCIERA */}
            <div className="pt-4 border-t border-slate-100 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <ArchonField label="Cuenta Contable" icon={Tag}>
                  <input
                    type="text"
                    placeholder="8019-XXX-XXX"
                    className="archon-input font-mono"
                    value={formData.accountingAccount || ''}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                    ): void => setFormData({ ...formData, accountingAccount: e.target.value })}
                  />
                </ArchonField>
                <ArchonField label="Cuota Mensual / Arrend." icon={Zap}>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-sky-500/50 focus-within:border-sky-500 transition-all duration-300 shadow-inner">
                    <span className="px-4 py-3 text-slate-400 font-bold border-r border-slate-200 bg-slate-100 flex-shrink-0">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej: 15500.50"
                      className="flex-1 w-full bg-transparent px-4 py-3 outline-none border-none focus:ring-0 font-mono text-emerald-700 font-bold"
                      value={formData.monthlyLeasePayment ?? ''}
                      onChange={(
                        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                      ): void =>
                        setFormData({
                          ...formData,
                          monthlyLeasePayment: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                </ArchonField>
              </div>
            </div>
          </div>

          <ArchonField label="Evidencia Fotográfica" icon={PlusCircle}>
            <ArchonImageUploader
              images={formData.images ?? []}
              onChange={(imgs: string[]): void => setFormData({ ...formData, images: imgs })}
              maxImages={4}
            />
          </ArchonField>
        </div>

        {/* PANEL 3: PERFIL TÉCNICO DE LA UNIDAD (Bottom-Left) */}
        <div
          className="glass-card-pro bg-white p-10 space-y-8 relative z-10"
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
                  placeholder="Ej: 2024"
                  className="archon-input font-mono"
                  value={formData.year ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                    setFormData({
                      ...formData,
                      year: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                />
              </ArchonField>
              <ArchonField label="Color Dominante" icon={Activity}>
                <ArchonSelect
                  options={(controller.colors || []).map((c: CatalogOption) => ({
                    value: c.label,
                    label: c.label,
                  }))}
                  value={formData.color ?? ''}
                  onChange={(val: string): void => setFormData({ ...formData, color: val })}
                />
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Tracción / Drive" icon={Gauge}>
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

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Configuración de Motor" icon={Activity}>
                <ArchonSelect
                  options={engineTypes.map((e: CatalogOption) => ({
                    value: e.label, // Engine types currently use the label as value in the DB string field
                    label: e.label,
                  }))}
                  value={formData.motor ?? ''}
                  onChange={(val: string): void => setFormData({ ...formData, motor: val })}
                />
              </ArchonField>
              <ArchonField label="Combustible" icon={Zap}>
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
              <ArchonField label="Capacidad de Carga" icon={Truck}>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 1500.0"
                    className="archon-input font-mono w-full pr-14 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={formData.capacidadCarga ?? ''}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                    ): void =>
                      setFormData({
                        ...formData,
                        capacidadCarga: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                  <span className="absolute right-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                    KG
                  </span>
                </div>
              </ArchonField>
              <ArchonField label="Capacidad Combustible" icon={Zap} required>
                <div className="relative flex items-center">
                  <input
                    required
                    type="number"
                    step="0.1"
                    placeholder="Ej: 80.0"
                    className="archon-input font-mono w-full pr-14 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-amber-600 font-bold"
                    value={formData.fuelTankCapacity ?? ''}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                    ): void =>
                      setFormData({
                        ...formData,
                        fuelTankCapacity: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                  <span className="absolute right-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                    LTS
                  </span>
                </div>
              </ArchonField>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-6">
              <h4 className="text-[10px] font-black text-navy-400 uppercase tracking-[0.2em]">
                Especificaciones de Rodado & Terreno
              </h4>
              <div className="grid grid-cols-2 gap-6">
                <ArchonField label="Medida de Llanta" icon={Activity}>
                  <input
                    type="text"
                    placeholder="Ej: 265/65 R17"
                    className="archon-input font-mono"
                    value={formData.tireSpec}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                    ): void => setFormData({ ...formData, tireSpec: e.target.value })}
                  />
                </ArchonField>
                <ArchonField label="Marca de Llanta" icon={Truck}>
                  <ArchonSelect
                    options={controller.tireBrands.map((b: CatalogOption) => ({
                      value: b.id.toString(),
                      label: b.label,
                    }))}
                    value={formData.tireBrandId?.toString() || ''}
                    onChange={(val: string): void =>
                      setFormData({ ...formData, tireBrandId: parseInt(val, 10) })
                    }
                  />
                </ArchonField>
              </div>
              <ArchonField label="Perfil de Terreno Dominante" icon={MapPin}>
                <ArchonSelect
                  options={controller.terrainTypes.map((t: CatalogOption) => ({
                    value: t.id.toString(),
                    label: t.label,
                  }))}
                  value={formData.terrainTypeId?.toString() || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, terrainTypeId: parseInt(val, 10) })
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
          className="glass-card-pro bg-white p-10 space-y-8 relative z-10"
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
                  options={locations.map((l) => ({ value: l.label, label: l.label }))}
                  value={formData.sede ?? ''}
                  onChange={(val: string): void => setFormData({ ...formData, sede: val })}
                />
              </ArchonField>

              <ArchonField label="Lectura Base (Odómetro / Horómetro)" icon={Gauge}>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 45000"
                    className="archon-input font-mono text-navy-800 w-full pr-14 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={formData.odometer ?? ''}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                    ): void => {
                      setFormData({
                        ...formData,
                        odometer: e.target.value ? parseFloat(e.target.value) : undefined,
                      });
                    }}
                  />
                  <span className="absolute right-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                    {((): string => {
                      const selected = controller.assetTypes.find(
                        (at) => at.id === formData.assetTypeId
                      );
                      return selected?.code === 'AT_VEH' || selected?.label === 'Vehículo'
                        ? 'KM'
                        : 'HRS';
                    })()}
                  </span>
                </div>
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Ciclo Mto. (Fec.)" icon={Calendar}>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    placeholder="Ej: 90"
                    className="archon-input font-mono text-navy-800 w-full pr-16 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={formData.maintIntervalDays ?? ''}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                    ): void => {
                      setFormData({
                        ...formData,
                        maintIntervalDays: e.target.value
                          ? parseInt(e.target.value, 10)
                          : undefined,
                      });
                    }}
                  />
                  <span className="absolute right-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                    DÍAS
                  </span>
                </div>
              </ArchonField>

              <ArchonField label="Ciclo Mto. (Uso)" icon={Activity}>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    placeholder="Ej: 5000"
                    className="archon-input font-mono text-navy-800 w-full pr-16 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={formData.maintIntervalKm ?? ''}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                    ): void => {
                      setFormData({
                        ...formData,
                        maintIntervalKm: e.target.value ? parseFloat(e.target.value) : undefined,
                      });
                    }}
                  />
                  <span className="absolute right-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                    {((): string => {
                      const selected = controller.assetTypes.find(
                        (at) => at.id === formData.assetTypeId
                      );
                      return selected?.code === 'AT_VEH' || selected?.label === 'Vehículo'
                        ? 'KM'
                        : 'HRS';
                    })()}
                  </span>
                </div>
              </ArchonField>
            </div>

            <ArchonField label="Centro de Gestión Autorizado" icon={Settings}>
              <ArchonSelect
                options={(controller.maintenanceCenters || []).map((m: CatalogOption) => ({
                  value: m.label,
                  label: m.label,
                }))}
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
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 40000"
                    className="archon-input font-mono w-full pr-14 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={formData.lastServiceReading ?? ''}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                    ): void => {
                      setFormData({
                        ...formData,
                        lastServiceReading: e.target.value ? parseFloat(e.target.value) : undefined,
                      });
                    }}
                  />
                  <span className="absolute right-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                    {((): string => {
                      const selected = controller.assetTypes.find(
                        (at) => at.id === formData.assetTypeId
                      );
                      return selected?.code === 'AT_VEH' || selected?.label === 'Vehículo'
                        ? 'KM'
                        : 'HRS';
                    })()}
                  </span>
                </div>
              </ArchonField>
            </div>

            <ArchonField label="Uso Promedio Diario (Km/Hr)" icon={Activity}>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ej: 50.5"
                  className="archon-input font-mono text-emerald-700 font-bold w-full pr-16 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={formData.dailyUsageAvg ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                    setFormData({
                      ...formData,
                      dailyUsageAvg: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
                <span className="absolute right-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                  {((): string => {
                    const selected = controller.assetTypes.find(
                      (at) => at.id === formData.assetTypeId
                    );
                    return selected?.code === 'AT_VEH' || selected?.label === 'Vehículo'
                      ? 'KM/D'
                      : 'HR/D';
                  })()}
                </span>
              </div>
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

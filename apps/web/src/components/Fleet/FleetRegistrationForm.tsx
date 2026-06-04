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
  Trash2,
} from 'lucide-react';
import ArchonField from '../ArchonField';
import { formatDate } from '../../utils/dateUtils';
import ArchonSelect from '../ArchonSelect';
import ArchonDatePicker from '../ArchonDatePicker';
import ArchonImageUploader from '../ArchonImageUploader';
import ArchonFeedbackBanner from '../ArchonFeedbackBanner';
import AuditJustificationModal from '../Common/AuditJustificationModal';
import api from '../../api/client';
import { calculateMaintForecast } from '../../utils/fleetPredictiveEngine';
import { predecirHologramaYEngomado } from '../../utils/fleetCompliance';
import { UseFleetFormReturn, CatalogOption, CreateFleetUnit } from '../../types/fleet';

/**
 * 🔱 Archon Alpha v.37.2.0 - "2x2 AXIAL ARCHITECTURE"
 * Rebuilt to eliminate pronounced border radii and strictly enforce
 * the Industrial 2x2 symmetry identical to the Personnel Registry.
 */

interface FleetRegistrationFormProps {
  controller: UseFleetFormReturn;
  onSuccess: () => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
  unitId?: string;
}

const getPronosticoArchon = (
  formData: CreateFleetUnit
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

  if (!formData.lastServiceDate || !formData.maintIntervalDays) return result;

  const intDias = formData.maintIntervalDays;
  const intServi = formData.maintIntervalKm || 0;
  const dailyAvg = formData.dailyUsageAvg || 0;
  const odometer = formData.odometer || 0;
  const lastReading = formData.lastServiceReading || 0;

  const hasUsageData = intServi > 0 && dailyAvg > 0 && lastReading !== undefined;

  if (hasUsageData) {
    const forecast = calculateMaintForecast(
      intDias,
      intServi,
      dailyAvg,
      odometer,
      lastReading,
      formData.lastServiceDate
    );

    if (forecast) {
      result.pronosticoDateStr = formatDate(forecast.forecastDate);
      const motivo = forecast.serviceByKmDate < forecast.serviceByTimeDate ? 'Uso/KM' : 'Tiempo';
      result.pronosticoText = `Vencimiento proyectado por límite de ${motivo}.`;
      result.isPronosticoReady = true;
      return result;
    }
  }

  // 🔱 Fallback Soberano: Proyectar solo por tiempo
  const lastDate = new Date(formData.lastServiceDate);
  const forecastDate = new Date(lastDate);
  forecastDate.setDate(forecastDate.getDate() + intDias);

  result.pronosticoDateStr = formatDate(forecastDate);
  result.pronosticoText = 'Vencimiento proyectado por límite de Tiempo.';
  result.isPronosticoReady = true;

  return result;
};

const FleetRegistrationForm: React.FC<FleetRegistrationFormProps> = ({
  controller,
  onSuccess,
  onCancel,
  isEdit = false,
  unitId,
}: FleetRegistrationFormProps): React.JSX.Element => {
  const [isAuditModalOpen, setIsAuditModalOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [auditAction, setAuditAction] = React.useState<'UPDATE' | 'DELETE'>('UPDATE');
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
    departments,
    locations,
    useTypes,
    engineTypes,
    environmentalHolograms,
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

  const { pronosticoText, pronosticoDateStr, isPronosticoReady } = getPronosticoArchon(formData);

  // 🔱 Asistente Predictivo de Cumplimiento Ambiental (Hoy No Circula)
  const [prediction, setPrediction] = React.useState<{
    hologramaSugerido: string;
    engomadoColor: string;
    mesesVerificacion: string;
  } | null>(null);

  React.useEffect(() => {
    const selectedAssetType = assetTypes.find((t) => t.id === formData.assetTypeId);
    const assetTypeCode = selectedAssetType?.code || null;

    if (formData.placas) {
      const pred = predecirHologramaYEngomado(
        formData.placas,
        formData.year || null,
        assetTypeCode
      );
      setPrediction(pred);

      // Auto-completar el holograma únicamente si el usuario aún no lo ha seleccionado o está vacío
      if (!formData.environmentalHologram) {
        setFormData((prev) => ({
          ...prev,
          environmentalHologram: pred.hologramaSugerido,
        }));
      }
    } else {
      setPrediction(null);
    }
  }, [formData.placas, formData.year, formData.assetTypeId, assetTypes]);

  const handleConfirmDelete = async (reason: string): Promise<void> => {
    setIsProcessing(true);
    try {
      await api.delete(`/fleet/${unitId}`, {
        data: { reason },
      });
      await onSuccess();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('🔱 [Fleet Delete Error]:', err);
    } finally {
      setIsProcessing(false);
      setIsAuditModalOpen(false);
    }
  };

  const handleConfirmAudit = async (reason: string): Promise<void> => {
    setIsProcessing(true);
    try {
      if (auditAction === 'UPDATE') {
        await api.patch(`/fleet/${unitId}`, {
          data: formData,
          reason,
        });
      } else {
        await api.delete(`/fleet/${unitId}`, {
          data: { reason },
        });
      }
      await onSuccess();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('🔱 [Fleet Audit Error]:', err);
    } finally {
      setIsProcessing(false);
      setIsAuditModalOpen(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isEdit) {
      setAuditAction('UPDATE');
      setIsAuditModalOpen(true);
    } else {
      try {
        await handleSubmit(e, onSuccess);
      } catch (err: unknown) {
        // Logic handled by hook state
      }
    }
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-40 space-y-8"
    >
      <ArchonFeedbackBanner message={error || ''} type="error" onClear={resetError} />

      {/* ── 2x2 PANEL ARCHITECTURE ─────────────────────────────────────── */}
      <div className="archon-grid-2-sovereign items-stretch gap-10">
        {/* PANEL 1: MOTOR DE JERARQUÍA (Top-Left) */}
        <div className="card-archon-sovereign bg-white p-10 space-y-8 relative z-20 [--card-accent:#0f2a44]">
          <div className="card-sovereign-header">
            <Layers className="text-[var(--card-accent)]" size={22} />
            <h3 className="card-sovereign-title text-archon-xl opacity-100">IDENTIDAD</h3>
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
                  className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-bold text-lg tracking-widest text-[#0f2a44]"
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
                  className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none uppercase font-mono"
                  value={formData.placas ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                    setFormData({ ...formData, placas: e.target.value.toUpperCase() })
                  }
                />
              </ArchonField>
              <ArchonField label="Número de Serie / VIN" icon={ShieldCheck}>
                <input
                  type="text"
                  placeholder="Ej: 3VW... (17 caracteres)"
                  className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono"
                  value={formData.numeroSerie ?? ''}
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

            <ArchonField label="Evidencia Fotográfica" icon={PlusCircle}>
              <ArchonImageUploader
                compact
                images={formData.images ?? []}
                onChange={(imgs: string[]): void => setFormData({ ...formData, images: imgs })}
                onFileChange={(files: File[]): Promise<void> => controller.setSelectedFiles(files)}
                maxImages={4}
              />
            </ArchonField>
          </div>
        </div>

        {/* PANEL 2: IDENTIDAD & CUMPLIMIENTO (Top-Right) */}
        <div className="card-archon-sovereign bg-white p-10 space-y-8 relative z-20 [--card-accent:#0f2a44]">
          <div className="card-sovereign-header">
            <ShieldCheck size={22} className="text-[var(--card-accent)]" />
            <h3 className="card-sovereign-title text-archon-xl opacity-100">CUMPLIMIENTO</h3>
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
                  className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono"
                  value={formData.insurancePolicyNumber || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                    setFormData({ ...formData, insurancePolicyNumber: e.target.value })
                  }
                />
              </ArchonField>
              <ArchonField label="Aseguradora" icon={ShieldCheck}>
                <ArchonSelect
                  options={(controller.insuranceCompanies || []).map((c: CatalogOption) => ({
                    value: c.id.toString(),
                    label: c.label,
                  }))}
                  value={formData.insuranceCompanyId?.toString() || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, insuranceCompanyId: parseInt(val, 10) })
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
              <ArchonField label="Costo de Seguro" icon={ShieldCheck}>
                <div className="flex items-center w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus-within:border-b-[#f2b705] focus-within:bg-white focus-within:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] transition-all duration-300">
                  <span className="text-[#0f2a44]/40 font-bold text-archon-lg">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej: 850.00"
                    className="flex-1 w-full bg-transparent px-2 py-0 border-none outline-none focus:ring-0 text-archon-lg font-mono text-emerald-600 font-bold placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal"
                    value={
                      formData.insuranceCost !== undefined && formData.insuranceCost !== null
                        ? formData.insuranceCost
                        : ''
                    }
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                      const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                      setFormData({ ...formData, insuranceCost: val });
                    }}
                  />
                </div>
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Folio Tarjeta Circulación" icon={Tag}>
                <input
                  type="text"
                  placeholder="Ej: 123456789"
                  className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono"
                  value={formData.circulationCardNumber || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                    setFormData({ ...formData, circulationCardNumber: e.target.value })
                  }
                />
              </ArchonField>
              <ArchonField label="Cumplimiento Legal (Placas)" icon={Calendar}>
                <ArchonDatePicker
                  value={formData.legalComplianceDate || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, legalComplianceDate: val })
                  }
                />
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Verif. Ambiental" icon={Activity}>
                <ArchonDatePicker
                  value={formData.lastEnvironmentalVerification || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, lastEnvironmentalVerification: val })
                  }
                />
              </ArchonField>
              <ArchonField label="Inspección Físico-Mecánica" icon={Settings}>
                <ArchonDatePicker
                  value={formData.lastMechanicalVerification || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, lastMechanicalVerification: val })
                  }
                />
              </ArchonField>
            </div>

            <ArchonField label="Holograma Ambiental" icon={ShieldCheck}>
              <ArchonSelect
                options={environmentalHolograms.map((t: CatalogOption) => ({
                  value: t.code || '',
                  label: t.label,
                }))}
                value={formData.environmentalHologram || ''}
                onChange={(val: string): void =>
                  setFormData({ ...formData, environmentalHologram: val })
                }
              />
              {prediction && (
                <div className="mt-2.5 p-3 rounded bg-[#0f2a44]/5 border border-[#0f2a44]/10 flex items-center justify-between text-xs transition-all duration-300">
                  <div className="flex items-center gap-2.5">
                    {/* Engomado Color Preview Badge */}
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shrink-0 shadow-sm"
                      style={{
                        backgroundColor: ((): string => {
                          const colors: Record<string, string> = {
                            Amarillo: '#facc15',
                            Rosa: '#ec4899',
                            Rojo: '#ef4444',
                            Verde: '#22c55e',
                            Azul: '#3b82f6',
                            Exento: '#10b981',
                          };
                          return colors[prediction.engomadoColor] || '#94a3b8';
                        })(),
                      }}
                    />
                    <div>
                      <p className="text-archon-base font-black uppercase text-[#0f2a44] tracking-wider">
                        Calendario: {prediction.engomadoColor}
                      </p>
                      <p className="text-archon-sm text-[#0f2a44]/60 font-bold uppercase tracking-wider">
                        Verificación: {prediction.mesesVerificacion}
                      </p>
                    </div>
                  </div>
                  {formData.environmentalHologram !== prediction.hologramaSugerido && (
                    <button
                      type="button"
                      onClick={(): void =>
                        setFormData((prev) => ({
                          ...prev,
                          environmentalHologram: prediction.hologramaSugerido,
                        }))
                      }
                      className="text-archon-sm font-black uppercase text-[#f2b705] hover:text-[#f2b705]/80 bg-transparent border-0 cursor-pointer p-0 underline tracking-wider"
                    >
                      Usar Sugerido (H-{prediction.hologramaSugerido})
                    </button>
                  )}
                </div>
              )}
            </ArchonField>

            {/* 💰 GESTIÓN FINANCIERA */}
            <div className="pt-4 border-t border-slate-100 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <ArchonField label="Cuenta Contable" icon={Tag}>
                  <input
                    type="text"
                    placeholder="8019-XXX-XXX"
                    className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono"
                    value={formData.accountingAccount || ''}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                    ): void => setFormData({ ...formData, accountingAccount: e.target.value })}
                  />
                </ArchonField>
                <ArchonField label="Cuota Mensual / Arrend." icon={Zap}>
                  <div className="flex items-center bg-pinnacle-navy/5 border border-pinnacle-navy/10 rounded-[4px] overflow-hidden focus-within:ring-2 focus-within:ring-pinnacle-navy/20 focus-within:border-pinnacle-navy/30 transition-all duration-300">
                    <span className="px-4 py-3 text-pinnacle-navy/40 font-bold border-r border-pinnacle-navy/10 bg-pinnacle-navy/5 flex-shrink-0">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej: 15500.50"
                      className="flex-1 w-full bg-transparent px-4 py-3 outline-none border-none focus:ring-0 font-mono text-emerald-600 font-bold placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal"
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
        </div>

        {/* PANEL 3: PERFIL TÉCNICO DE LA UNIDAD (Bottom-Left) */}
        <div className="card-archon-sovereign bg-white p-10 space-y-8 relative z-10 [--card-accent:#0f2a44]">
          <div className="card-sovereign-header">
            <Cpu size={22} className="text-[var(--card-accent)]" />
            <h3 className="card-sovereign-title text-archon-xl opacity-100">PERFIL TÉCNICO</h3>
          </div>

          <div className="space-y-6 flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Año de Fabricación" icon={Calendar} required>
                <input
                  required
                  type="number"
                  min={1990}
                  max={2030}
                  placeholder="Ej: 2024"
                  className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono"
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
                    value: c.id.toString(),
                    label: c.label,
                  }))}
                  value={formData.colorId?.toString() || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, colorId: parseInt(val, 10) })
                  }
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
                    value: e.id.toString(),
                    label: e.label,
                  }))}
                  value={formData.engineTypeId?.toString() || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, engineTypeId: parseInt(val, 10) })
                  }
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
                    className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-14 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                  <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
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
                    className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-14 rounded-[4px] text-archon-lg font-bold text-[#f2b705] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none font-bold"
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
                  <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                    LTS
                  </span>
                </div>
              </ArchonField>
              <ArchonField
                label={isEdit ? 'Nivel de Combustible Actual' : 'Nivel de Combustible Inicial'}
                icon={Zap}
                required
                className="col-span-2"
              >
                <div className="relative flex items-center">
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ej: 100.00"
                    className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-14 rounded-[4px] text-archon-lg font-bold text-[#f2b705] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none font-bold"
                    value={isEdit ? formData.lastFuelLevel ?? '' : formData.initialFuelLevel ?? ''}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                    ): void => {
                      const val = e.target.value ? parseFloat(e.target.value) : undefined;
                      if (isEdit) {
                        setFormData({
                          ...formData,
                          lastFuelLevel: val,
                        });
                      } else {
                        setFormData({
                          ...formData,
                          initialFuelLevel: val,
                          lastFuelLevel: val,
                        });
                      }
                    }}
                  />
                  <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                    %
                  </span>
                </div>
              </ArchonField>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-6">
              <h4 className="text-archon-base font-black text-navy-400 uppercase tracking-[0.2em]">
                Especificaciones de Rodado & Terreno
              </h4>
              <div className="grid grid-cols-2 gap-6">
                <ArchonField label="Medida de Llanta" icon={Activity}>
                  <input
                    type="text"
                    placeholder="Ej: 265/65 R17"
                    className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono"
                    value={formData.tireSpec ?? ''}
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
          </div>
        </div>

        {/* PANEL 4: LOGÍSTICA ESTRATÉGICA & MANTENIMIENTO (Bottom-Right) */}
        <div className="card-archon-sovereign bg-white p-10 space-y-8 relative z-10 [--card-accent:#0f2a44]">
          <div className="card-sovereign-header">
            <MapPin size={22} className="text-[var(--card-accent)]" />
            <h3 className="card-sovereign-title text-archon-xl opacity-100">LOGÍSTICA & MTO.</h3>
          </div>

          <div className="space-y-6 flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Sede de Operación" icon={MapPin}>
                <ArchonSelect
                  options={locations.map((l) => ({ value: l.id.toString(), label: l.label }))}
                  value={formData.locationId?.toString() || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, locationId: parseInt(val, 10) })
                  }
                />
              </ArchonField>

              <ArchonField label="Lectura Base (Odómetro / Horómetro)" icon={Gauge}>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 45000"
                    className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-14 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                  <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
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
                    className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-16 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                  <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                    DÍAS
                  </span>
                </div>
              </ArchonField>

              <ArchonField label="Ciclo Mto. (Uso)" icon={Activity}>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    placeholder="Ej: 5000"
                    className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-16 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                  <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
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
              <ArchonField label="Última Fecha de Servicio" icon={Calendar}>
                <ArchonDatePicker
                  value={formData.lastServiceDate || ''}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, lastServiceDate: val })
                  }
                />
              </ArchonField>

              <ArchonField label="Lectura en Último Servicio" icon={Gauge}>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 40000"
                    className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-14 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={formData.lastServiceReading ?? ''}
                    onChange={(
                      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                    ): void =>
                      setFormData({
                        ...formData,
                        lastServiceReading: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                  <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
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
                  value: m.id.toString(),
                  label: m.label,
                }))}
                value={formData.maintenanceCenterId?.toString() || ''}
                onChange={(val: string): void =>
                  setFormData({ ...formData, maintenanceCenterId: parseInt(val, 10) })
                }
              />
            </ArchonField>

            <ArchonField label="Uso Promedio Diario (Km/Hr)" icon={Activity}>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ej: 50.5"
                  className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 pr-16 rounded-[4px] text-archon-lg font-bold text-emerald-600 transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none font-bold"
                  value={formData.dailyUsageAvg ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                    setFormData({
                      ...formData,
                      dailyUsageAvg: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
                <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
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
          </div>
        </div>
      </div>

      {/* 🔮 PANEL 5: NOTAS Y PRONÓSTICO DE RENDIMIENTO (Shared Axial Alignment Row) */}
      <div className="archon-grid-2-sovereign items-stretch gap-10 mt-10">
        {/* Left Side: Notas Técnicas de Fábrica Card */}
        <div className="card-archon-sovereign bg-white p-10 space-y-8 relative z-10 [--card-accent:#0f2a44] min-h-[190px] flex flex-col justify-between">
          <div className="card-sovereign-header">
            <FileText size={22} className="text-[var(--card-accent)]" />
            <h3 className="card-sovereign-title text-archon-xl opacity-100">
              ESPECIFICACIONES DE FÁBRICA
            </h3>
          </div>
          <div className="flex-1 flex flex-col">
            <textarea
              placeholder="Ingresar especificaciones críticas de este activo..."
              className="w-full bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none flex-1 min-h-[110px] py-4 resize-none leading-relaxed"
              value={formData.description ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
        </div>

        {/* Right Side: Pronóstico Automático Wow Card */}
        <div className="card-archon-sovereign bg-white p-10 space-y-8 relative z-10 [--card-accent:#0f2a44] min-h-[190px] flex flex-col justify-between">
          <div className="card-sovereign-header">
            <Zap size={22} className="text-[var(--card-accent)]" />
            <h3 className="card-sovereign-title text-archon-xl opacity-100">
              PRONÓSTICO AUTOMÁTICO
            </h3>
          </div>

          <div
            className={`p-5 rounded-[4px] border ${
              isPronosticoReady
                ? 'bg-pinnacle-navy border-pinnacle-navy/20 shadow-lg'
                : 'bg-pinnacle-navy/5 border-pinnacle-navy/10'
            } transition-all duration-500 flex-1 flex flex-col justify-center`}
          >
            <div className="flex items-center gap-4">
              <Zap
                className={
                  isPronosticoReady ? 'text-pinnacle-yellow animate-pulse' : 'text-pinnacle-navy/20'
                }
                size={24}
              />
              <div className="flex-1">
                {isPronosticoReady ? (
                  <div className="space-y-0.5">
                    <p className="text-2xl font-black text-white tracking-tighter">
                      {pronosticoDateStr}
                    </p>
                    <p className="text-archon-base text-white/60 font-bold uppercase tracking-widest">
                      {pronosticoText}
                    </p>
                  </div>
                ) : (
                  <p className="text-archon-base text-pinnacle-navy/40 font-bold uppercase tracking-widest">
                    {pronosticoText}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="archon-grid-2-sovereign mt-10 pt-0 border-t border-pinnacle-navy/5">
        <div>
          {isEdit && (
            <button
              type="button"
              onClick={(): void => {
                setAuditAction('DELETE');
                setIsAuditModalOpen(true);
              }}
              className="btn-sentinel-red w-full"
            >
              <Trash2 size={18} /> Eliminar Activo
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 w-full">
          <button type="button" onClick={onCancel} className="btn-sentinel-red w-full">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isProcessing || !canSubmit}
            className={`btn-sentinel-emerald w-full ${
              !canSubmit || isSubmitting || isProcessing
                ? 'opacity-50 grayscale cursor-not-allowed'
                : ''
            }`}
          >
            {((): string => {
              if (isSubmitting || isProcessing) return 'Transmitiendo...';
              return isEdit ? 'Sincronizar Cambios' : 'Confirmar Alta';
            })()}
            <Save size={18} />
          </button>
        </div>
      </div>

      <AuditJustificationModal
        isOpen={isAuditModalOpen}
        onClose={(): void => setIsAuditModalOpen(false)}
        onConfirm={(reason: string): Promise<void> =>
          auditAction === 'UPDATE' ? handleConfirmAudit(reason) : handleConfirmDelete(reason)
        }
        title={
          auditAction === 'UPDATE'
            ? `Actualización técnica para el activo ${unitId}`
            : `Baja definitiva del activo ${unitId} del inventario industrial`
        }
        actionType={auditAction}
      />
    </form>
  );
};

export default FleetRegistrationForm;

import React from 'react';
import {
  Wrench,
  Calendar,
  Gauge,
  Activity,
  Calculator,
  ShieldCheck,
  Tag,
  FileText,
  Save,
  PlusCircle,
  Truck,
  User,
} from 'lucide-react';
import ArchonField from '../ArchonField';
import ArchonSelect from '../ArchonSelect';
import ArchonDatePicker from '../ArchonDatePicker';
import ArchonImageUploader from '../ArchonImageUploader';
import ArchonFeedbackBanner from '../ArchonFeedbackBanner';
import useServiceOrderForm from '../../hooks/useServiceOrderForm';
import { CatalogOption } from '../../types/fleet';

interface ServiceRecordFormProps {
  unitId: string;
  unitTag: string;
  currentOdometer: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const ServiceRecordForm: React.FC<ServiceRecordFormProps> = ({
  unitId,
  unitTag,
  currentOdometer,
  onSuccess,
  onCancel,
}): React.ReactElement => {
  const {
    formData,
    setFormData,
    isLoading,
    isSubmitting,
    error,
    resetError,
    serviceTypes,
    serviceStatuses,
    providers,
    handleSubmit,
  } = useServiceOrderForm(unitId);

  const totalCost = (formData.laborCost || 0) + (formData.partsCost || 0);

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    await handleSubmit(e, onSuccess);
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="animate-in fade-in slide-in-from-right-8 duration-500 w-full max-w-[1400px] mx-auto pb-20 space-y-8"
    >
      <ArchonFeedbackBanner message={error || ''} type="error" onClear={resetError} />

      <div className="archon-grid-2 items-start gap-8">
        {/* PANEL 1: IDENTIDAD DEL SERVICIO */}
        <div
          className="glass-card-pro bg-white p-10 space-y-8 relative"
          style={{ borderTop: '4px solid #0f2a44' }}
        >
          <div className="archon-card-header-pro">
            <Wrench className="text-navy-700" size={24} />
            <h3 className="text-navy-900 font-bold uppercase tracking-wider text-lg">
              IDENTIDAD DEL SERVICIO
            </h3>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Unidad" icon={Truck}>
                <input
                  disabled
                  type="text"
                  className="archon-input bg-slate-50 font-bold text-sky-900"
                  value={unitTag}
                />
              </ArchonField>
              <ArchonField label="Folio Interno" icon={Tag}>
                <input
                  disabled
                  type="text"
                  placeholder="Generado al guardar..."
                  className="archon-input bg-slate-50 italic text-slate-400"
                  value=""
                />
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Fecha de Servicio" icon={Calendar} required>
                <ArchonDatePicker
                  value={formData.serviceDate}
                  onChange={(val: string): void => setFormData({ ...formData, serviceDate: val })}
                />
              </ArchonField>
              <ArchonField label="Lectura de Servicio" icon={Gauge} required>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    placeholder={`Actual: ${currentOdometer}`}
                    className="archon-input font-mono text-navy-800 w-full pr-14"
                    value={formData.odometerAtService || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData({
                        ...formData,
                        odometerAtService: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <span className="absolute right-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    KM/H
                  </span>
                </div>
              </ArchonField>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Tipo de Mantenimiento" icon={Activity} required>
                <ArchonSelect
                  options={serviceTypes.map((t: CatalogOption) => ({
                    value: t.id.toString(),
                    label: t.label,
                  }))}
                  value={formData.serviceTypeId.toString()}
                  placeholder="Seleccionar tipo..."
                  onChange={(val: string): void =>
                    setFormData({ ...formData, serviceTypeId: parseInt(val, 10) })
                  }
                />
              </ArchonField>
              <ArchonField label="Estatus de Orden" icon={ShieldCheck}>
                <ArchonSelect
                  options={serviceStatuses.map((s: CatalogOption) => ({
                    value: s.id.toString(),
                    label: s.label,
                  }))}
                  value={formData.statusId.toString()}
                  onChange={(val: string): void =>
                    setFormData({ ...formData, statusId: parseInt(val, 10) })
                  }
                />
              </ArchonField>
            </div>
          </div>
        </div>

        {/* PANEL 2: GESTIÓN FINANCIERA & PROVEEDOR */}
        <div
          className="glass-card-pro bg-white p-10 space-y-8 relative"
          style={{ borderTop: '4px solid #10b981' }}
        >
          <div className="archon-card-header-pro">
            <Calculator className="text-emerald-600" size={24} />
            <h3 className="text-navy-900 font-bold uppercase tracking-wider text-lg">
              GESTIÓN FINANCIERA
            </h3>
          </div>

          <div className="space-y-6">
            <ArchonField label="Proveedor / Taller" icon={Truck} required>
              <ArchonSelect
                options={providers.map((p: CatalogOption) => ({
                  value: p.id.toString(),
                  label: p.label,
                }))}
                value={formData.providerId.toString()}
                placeholder="Seleccionar taller..."
                onChange={(val: string): void =>
                  setFormData({ ...formData, providerId: parseInt(val, 10) })
                }
              />
            </ArchonField>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Costo Mano de Obra" icon={User}>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md overflow-hidden">
                  <span className="px-4 py-3 text-slate-400 font-bold border-r border-slate-200">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    className="flex-1 bg-transparent px-4 py-3 outline-none font-mono text-navy-700"
                    value={formData.laborCost || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData({ ...formData, laborCost: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </ArchonField>
              <ArchonField label="Costo Refacciones" icon={Wrench}>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md overflow-hidden">
                  <span className="px-4 py-3 text-slate-400 font-bold border-r border-slate-200">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    className="flex-1 bg-transparent px-4 py-3 outline-none font-mono text-navy-700"
                    value={formData.partsCost || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData({ ...formData, partsCost: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </ArchonField>
            </div>

            {/* TOTAL DISPLAY */}
            <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-xl flex justify-between items-center">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">
                  Costo Total del Servicio
                </span>
                <p className="text-xs text-emerald-800/60 italic">
                  Cálculo automático de inversión operativa.
                </p>
              </div>
              <div className="text-3xl font-black text-emerald-700 font-mono">
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Técnico Responsable" icon={User}>
                <input
                  type="text"
                  placeholder="Nombre del mecánico..."
                  className="archon-input"
                  value={formData.technicianName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData({ ...formData, technicianName: e.target.value })
                  }
                />
              </ArchonField>
              <ArchonField label="Número de Factura" icon={FileText}>
                <input
                  type="text"
                  placeholder="Ej: F-12345"
                  className="archon-input font-mono uppercase"
                  value={formData.invoiceNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData({ ...formData, invoiceNumber: e.target.value.toUpperCase() })
                  }
                />
              </ArchonField>
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENTACIÓN FULL WIDTH */}
      <div className="glass-card-pro bg-white p-10 space-y-8">
        <div className="archon-card-header-pro">
          <FileText size={24} className="text-slate-500" />
          <h3 className="text-navy-900 font-bold uppercase tracking-wider text-lg">
            DOCUMENTACIÓN Y EVIDENCIA
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <ArchonField label="Descripción de Trabajos" icon={FileText}>
            <textarea
              placeholder="Detallar servicios realizados, refacciones instaladas y hallazgos..."
              className="archon-input min-h-[150px] p-6 resize-none leading-relaxed"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </ArchonField>
          <ArchonField label="Evidencia Fotográfica" icon={PlusCircle}>
            <ArchonImageUploader
              images={formData.images}
              onChange={(imgs: string[]): void => setFormData({ ...formData, images: imgs })}
              maxImages={6}
            />
          </ArchonField>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="flex justify-end gap-6 pt-10">
        <button
          type="button"
          onClick={onCancel}
          className="px-10 py-4 text-slate-400 font-bold uppercase tracking-widest hover:text-navy-600 transition-all"
        >
          Cancelar
        </button>
        <button
          disabled={isSubmitting || isLoading}
          type="submit"
          className="flex items-center gap-3 bg-navy-900 text-white px-12 py-4 rounded-md font-black uppercase tracking-widest hover:bg-sky-900 transition-all shadow-xl shadow-navy-900/20 disabled:opacity-50"
        >
          {isSubmitting ? (
            'Sincronizando...'
          ) : (
            <>
              <Save size={20} /> Registrar Servicio
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ServiceRecordForm;

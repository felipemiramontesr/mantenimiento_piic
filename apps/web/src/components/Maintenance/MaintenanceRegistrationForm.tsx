import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Truck,
  Calendar,
  Gauge,
  DollarSign,
  User,
  ClipboardCheck,
  Settings,
  Save,
  X,
} from 'lucide-react';
import {
  MaintenanceSchedulePayload,
  MaintenanceTemplateTask,
  ServiceType,
} from '../../types/maintenance';
import api from '../../api/client';
import { FleetUnit } from '../../types/fleet';
import ArchonField from '../ArchonField';
import ArchonSelect, { SelectOption } from '../ArchonSelect';

interface MaintenanceRegistrationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * 🔱 Archon Odometer-Based Mathematical Service Milestone Prediction Logic
 * Evaluates standard intervals and returns the closest first-to-expire service milestone
 */
const getRecommendedService = (odometer: number, isMining: boolean): ServiceType => {
  if (isMining) return 'MINOR_MINING';
  if (!odometer || odometer <= 0) return 'BASIC_10K';

  // Apply cyclical modular strategy (Odometer MOD 60000)
  const relativeKm = odometer % 60000;

  const milestones: { type: ServiceType; value: number }[] = [
    { type: 'ADVANCED_50K', value: 0 },
    { type: 'BASIC_10K', value: 10000 },
    { type: 'INTERMEDIATE_20K', value: 20000 },
    { type: 'MAJOR_30K', value: 30000 },
    { type: 'MAJOR_30K', value: 40000 },
    { type: 'ADVANCED_50K', value: 50000 },
    { type: 'ADVANCED_50K', value: 60000 },
  ];

  let bestType: ServiceType = 'BASIC_10K';
  let minDistance = Infinity;

  milestones.forEach((m) => {
    const distance = Math.abs(relativeKm - m.value);
    if (distance < minDistance) {
      minDistance = distance;
      bestType = m.type;
    }
  });

  return bestType;
};

/**
 * 🔱 Archon Maintenance Registration Form (v.2.0.0)
 * Sovereign UI: Industrial 2x2 Axial Architecture
 * Uses ArchonField + ArchonSelect combobox pattern
 */
const MaintenanceRegistrationForm: React.FC<MaintenanceRegistrationFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [units, setUnits] = useState<FleetUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [isMining, setIsMining] = useState<boolean>(false);
  const [template, setTemplate] = useState<MaintenanceTemplateTask[]>([]);

  const [formData, setFormData] = useState<Partial<MaintenanceSchedulePayload>>({
    serviceDate: new Date().toISOString().split('T')[0],
    odometerAtService: 0,
    cost: 0,
    technician: '',
    serviceType: 'BASIC_10K',
    details: [],
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch active units
  useEffect(() => {
    api.get('/fleet').then((res) => {
      if (res.data.success) {
        setUnits(res.data.data.filter((u: FleetUnit) => u.status !== 'Descontinuada'));
      }
    });
  }, []);

  // Update odometer and recommended service type on unit selection
  useEffect(() => {
    if (selectedUnit) {
      const unit = units.find((u) => u.id === selectedUnit);
      if (unit) {
        const initialOdo = unit.odometer || 0;
        const recommended = getRecommendedService(initialOdo, isMining);
        setFormData((prev) => ({
          ...prev,
          odometerAtService: initialOdo,
          serviceType: recommended,
        }));
      }
    }
  }, [selectedUnit, units]);

  // Update service type reactively when isMining or odometerAtService changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      serviceType: isMining
        ? 'MINOR_MINING'
        : getRecommendedService(prev.odometerAtService || 0, false),
    }));
  }, [isMining, formData.odometerAtService]);

  // Fetch template reactively on unit, mining status, serviceType or odometer change
  useEffect(() => {
    if (selectedUnit && formData.serviceType) {
      setLoading(true);
      api
        .get(
          `/maintenance/template/${selectedUnit}?isMining=${isMining}&serviceType=${
            formData.serviceType
          }&odometer=${formData.odometerAtService || 0}`
        )
        .then((res) => {
          if (res.data.success) {
            setTemplate(res.data.tasks);
            setFormData((prev) => ({
              ...prev,
              details: res.data.tasks.map((t: MaintenanceTemplateTask) => ({
                taskCode: t.code,
                status: 'PASS',
                notes: '',
              })),
            }));
          }
        })
        .finally(() => setLoading(false));
    }
  }, [selectedUnit, isMining, formData.serviceType, formData.odometerAtService]);

  // Unit options for ArchonSelect combobox (mirrors Routes panel format)
  const unitOptions: SelectOption[] = units.map((u) => ({
    value: u.id,
    label: `${u.id} - ${u.marca || ''} ${u.modelo || ''}`.trim(),
    secondaryLabel: `ODO: ${Number(u.odometer || 0).toLocaleString()} KM | ${
      u.placas || 'Sin placas'
    }`,
    searchTerms: `${u.marca || ''} ${u.modelo || ''} ${u.placas || ''} ${u.departamento || ''}`,
  }));

  // Sovereign Dynamic Service Type options with visual Recommended badges
  const recommendedService = getRecommendedService(formData.odometerAtService || 0, isMining);
  const serviceTypeOptions: SelectOption[] = [
    {
      value: 'BASIC_10K',
      label: `Básico 10,000 km${recommendedService === 'BASIC_10K' ? ' ✨' : ''}`,
      secondaryLabel: recommendedService === 'BASIC_10K' ? 'RECOMENDADO' : 'PREVENTIVO',
    },
    {
      value: 'INTERMEDIATE_20K',
      label: `Intermedio 20,000 km${recommendedService === 'INTERMEDIATE_20K' ? ' ✨' : ''}`,
      secondaryLabel: recommendedService === 'INTERMEDIATE_20K' ? 'RECOMENDADO' : 'PREVENTIVO',
    },
    {
      value: 'MAJOR_30K',
      label: `Mayor 30,000 km${recommendedService === 'MAJOR_30K' ? ' ✨' : ''}`,
      secondaryLabel: recommendedService === 'MAJOR_30K' ? 'RECOMENDADO' : 'PREVENTIVO',
    },
    {
      value: 'ADVANCED_50K',
      label: `Avanzado 50,000 km${recommendedService === 'ADVANCED_50K' ? ' ✨' : ''}`,
      secondaryLabel: recommendedService === 'ADVANCED_50K' ? 'RECOMENDADO' : 'PREVENTIVO',
    },
    {
      value: 'MINOR_MINING',
      label: `Servicio Menor - Mina${recommendedService === 'MINOR_MINING' ? ' ✨' : ''}`,
      secondaryLabel: recommendedService === 'MINOR_MINING' ? 'RECOMENDADO' : 'MINA',
    },
  ];

  // Detail status options
  const statusOptions: SelectOption[] = [
    { value: 'PASS', label: 'Correcto' },
    { value: 'REPLACED', label: 'Reemplazado' },
    { value: 'FAIL', label: 'Falla / Revisión' },
    { value: 'N_A', label: 'No Aplica' },
  ];

  const handleDetailChange = (index: number, field: string, value: string): void => {
    const newDetails = [...(formData.details || [])];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setFormData({ ...formData, details: newDetails });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: MaintenanceSchedulePayload = {
        unitId: selectedUnit,
        serviceDate: formData.serviceDate!,
        odometerAtService: Number(formData.odometerAtService),
        cost: Number(formData.cost),
        technician: formData.technician!,
        serviceType: formData.serviceType as ServiceType,
        details: formData.details || [],
      };

      const res = await api.post('/maintenance', payload);
      if (res.data.success) {
        onSuccess();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(
    selectedUnit &&
      formData.technician &&
      formData.odometerAtService &&
      formData.odometerAtService > 0
  );

  // Sovereign input class token (mirrored from FleetRegistrationForm)
  const inputClass =
    'w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-[13px] font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-[13px] placeholder:font-sans placeholder:tracking-normal outline-none';

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-20 space-y-8"
    >
      {/* ── 2-COLUMN SOVEREIGN LAYOUT ─────────────────────────────────── */}
      <div className="archon-grid-2-sovereign items-start gap-10 relative z-30">
        {/* PANEL 1: CONFIGURACIÓN DE SERVICIO (Left) */}
        <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 relative z-20 [--card-accent:#0f2a44]">
          <div className="card-sovereign-header">
            <Wrench className="text-[var(--card-accent)]" size={22} />
            <h3 className="card-sovereign-title text-[14px] opacity-100">CONFIGURACIÓN</h3>
          </div>

          <div className="space-y-6 relative z-10">
            <ArchonField label="1. Unidad Asignada" icon={Truck} required>
              <ArchonSelect
                options={unitOptions}
                value={selectedUnit}
                onChange={(val: string): void => setSelectedUnit(val)}
                placeholder="Buscar unidad..."
                icon={Truck}
              />
            </ArchonField>

            <ArchonField label="2. Tipo de Servicio" icon={Settings} required>
              <ArchonSelect
                options={serviceTypeOptions}
                value={formData.serviceType || ''}
                onChange={(val: string): void =>
                  setFormData({ ...formData, serviceType: val as ServiceType })
                }
                placeholder="Seleccionar tipo..."
                icon={Settings}
              />
            </ArchonField>

            <ArchonField label="Protocolo Mina" icon={ClipboardCheck}>
              <label className="flex items-center gap-3 cursor-pointer w-full h-11 bg-[#0f2a44]/5 px-4 rounded-[4px] border-0 border-b-2 border-solid border-[#0f2a44]/10 hover:bg-[#0f2a44]/8 transition-all duration-300">
                <input
                  type="checkbox"
                  checked={isMining}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setIsMining(e.target.checked)
                  }
                  className="w-4 h-4 text-[#f2b705] rounded border-[#0f2a44]/20 focus:ring-[#f2b705]"
                />
                <span className="text-[13px] font-bold text-[#0f2a44]">Servicio Menor — Mina</span>
              </label>
            </ArchonField>

            <div className="grid grid-cols-2 gap-6">
              <ArchonField label="Odómetro al Servicio" icon={Gauge} required>
                <div className="relative flex items-center">
                  <input
                    required
                    type="number"
                    min={0}
                    placeholder="Ej: 125000"
                    className={`${inputClass} font-mono pr-14`}
                    value={formData.odometerAtService || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData({ ...formData, odometerAtService: e.target.valueAsNumber })
                    }
                  />
                  <span className="absolute right-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                    KM
                  </span>
                </div>
              </ArchonField>
              <ArchonField label="Fecha de Servicio" icon={Calendar} required>
                <input
                  required
                  type="date"
                  className={`${inputClass} font-mono`}
                  value={formData.serviceDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData({ ...formData, serviceDate: e.target.value })
                  }
                />
              </ArchonField>
            </div>
          </div>
        </div>

        {/* PANEL 2: DATOS OPERATIVOS (Right) */}
        <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 relative z-20 [--card-accent:#0f2a44]">
          <div className="card-sovereign-header">
            <ClipboardCheck className="text-[var(--card-accent)]" size={22} />
            <h3 className="card-sovereign-title text-[14px] opacity-100">DATOS OPERATIVOS</h3>
          </div>

          <div className="space-y-6 relative z-10">
            <ArchonField label="Técnico Ejecutor" icon={User} required>
              <input
                required
                type="text"
                placeholder="Ej: Ing. J. Pérez"
                className={`${inputClass}`}
                value={formData.technician}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, technician: e.target.value })
                }
              />
            </ArchonField>

            <ArchonField label="Costo del Servicio" icon={DollarSign}>
              <div className="flex items-center w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus-within:border-b-[#f2b705] focus-within:bg-white focus-within:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] transition-all duration-300">
                <span className="text-[#0f2a44]/40 font-bold text-[13px]">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej: 3,450.00"
                  className="flex-1 w-full bg-transparent px-2 py-0 border-none outline-none focus:ring-0 text-[13px] font-mono text-emerald-600 font-bold placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-[13px] placeholder:font-sans placeholder:tracking-normal"
                  value={formData.cost || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData({ ...formData, cost: e.target.valueAsNumber })
                  }
                />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                  MXN
                </span>
              </div>
            </ArchonField>
          </div>
        </div>
      </div>

      {/* ── CHECKLIST OPERATIVO (Full Width) ───────────────────────────── */}
      {selectedUnit && (
        <div className="card-archon-sovereign bg-white relative z-0 [--card-accent:#0f2a44]">
          <div className="card-sovereign-header p-10 pb-0">
            <ClipboardCheck className="text-[var(--card-accent)]" size={22} />
            <h3 className="card-sovereign-title text-[14px] opacity-100">CHECKLIST OPERATIVO</h3>
          </div>

          {loading && (
            <div className="p-12 text-center text-[10px] font-black text-[#0f2a44]/40 uppercase tracking-[0.2em]">
              Generando matriz de inspección...
            </div>
          )}
          {!loading && template.length === 0 && (
            <div className="p-12 text-center text-[10px] font-black text-[#0f2a44]/30 uppercase tracking-[0.2em]">
              No se generaron tareas para esta configuración.
            </div>
          )}
          {!loading && template.length > 0 && (
            <div className="divide-y divide-[#0f2a44]/5">
              {template.map((task, idx) => (
                <div
                  key={task.code}
                  className="px-10 py-5 flex items-center gap-6 hover:bg-[#0f2a44]/[0.02] transition-colors duration-200"
                >
                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-[#0f2a44] truncate">
                      {task.label}
                    </div>
                    <div className="text-[9px] font-black text-[#0f2a44]/30 uppercase tracking-[0.15em] mt-0.5">
                      {task.code}
                    </div>
                  </div>

                  {/* Status selector */}
                  <div className="shrink-0 w-44">
                    <ArchonSelect
                      options={statusOptions}
                      value={formData.details![idx]?.status || 'PASS'}
                      onChange={(val: string): void => handleDetailChange(idx, 'status', val)}
                      searchable={false}
                    />
                  </div>

                  {/* Notes */}
                  <input
                    type="text"
                    placeholder="Notas..."
                    value={formData.details![idx]?.notes || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      handleDetailChange(idx, 'notes', e.target.value)
                    }
                    className="shrink-0 w-48 h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white px-4 rounded-[4px] text-[13px] font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-[13px] outline-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SOVEREIGN ACTION BAR ──────────────────────────────────────── */}
      <div className="flex justify-end gap-4 pt-6 border-t-2 border-[#0f2a44]/5">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 px-8 rounded-[4px] text-[11px] font-black text-[#0f2a44]/50 hover:bg-[#0f2a44]/5 uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-2"
        >
          <X size={14} />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="h-11 px-10 rounded-[4px] bg-[#0f2a44] text-white text-[11px] font-black uppercase tracking-[0.15em] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0f2a44]/90 transition-all duration-300 flex items-center gap-2.5 shadow-[0_4px_12px_rgba(15,42,68,0.15)]"
        >
          <Save size={14} />
          {submitting ? 'Procesando...' : 'Asentar Servicio'}
        </button>
      </div>
    </form>
  );
};

export default MaintenanceRegistrationForm;

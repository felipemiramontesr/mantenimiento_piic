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
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  MaintenanceSchedulePayload,
  MaintenanceTemplateTask,
  ServiceType,
  ServiceMode,
  SERVICE_HIERARCHY,
} from '../../types/maintenance';
import api from '../../api/client';
import { FleetUnit } from '../../types/fleet';
import ArchonField from '../ArchonField';
import ArchonSelect, { SelectOption } from '../ArchonSelect';
import { useUsers } from '../../context/UserContext';

interface MaintenanceRegistrationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * 🔱 Archon Odometer-Based Mathematical Service Milestone Prediction Logic
 * Evaluates standard intervals and returns the closest first-to-expire service milestone.
 * Single source of truth � mirrors backend getRecommendedServiceType().
 */
const getRecommendedService = (odometer: number, isMining: boolean): ServiceType => {
  if (isMining) return 'MINOR_MINING';
  if (!odometer || odometer <= 0) return 'BASIC_10K';
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
 * 🔱 Compliance Hierarchy Engine
 * Derives serviceMode from the ordinal comparison of userSelected vs systemRecommended.
 * MINOR_MINING (rank 0) is a parallel protocol � always FULL_COMPLIANCE.
 */
const deriveServiceMode = (
  userSelected: ServiceType,
  systemRecommended: ServiceType
): ServiceMode => {
  if (systemRecommended === 'MINOR_MINING' || userSelected === 'MINOR_MINING')
    return 'FULL_COMPLIANCE';
  return SERVICE_HIERARCHY[userSelected] >= SERVICE_HIERARCHY[systemRecommended]
    ? 'FULL_COMPLIANCE'
    : 'PARTIAL_EXECUTION';
};

/** Human-readable label map for service types (es-MX) */
const SERVICE_LABELS: Record<ServiceType, string> = {
  BASIC_10K: 'B�sico 10,000 km',
  INTERMEDIATE_20K: 'Intermedio 20,000 km',
  MAJOR_30K: 'Mayor 30,000 km',
  ADVANCED_50K: 'Avanzado 50,000 km',
  MINOR_MINING: 'Servicio Menor � Mina',
};

/**
 * 🔱 Archon Maintenance Registration Form (v.3.0.0 � Compliance Hierarchy)
 * Sovereign UI: Industrial 2x2 Axial Architecture
 * Dual-state engine: systemRecommended (immutable) + userSelected (mutable)
 */
const MaintenanceRegistrationForm: React.FC<MaintenanceRegistrationFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [units, setUnits] = useState<FleetUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [isMining, setIsMining] = useState<boolean>(false);
  const [template, setTemplate] = useState<MaintenanceTemplateTask[]>([]);
  const { users } = useUsers();

  /** Compliance Hierarchy: dual-state split */
  const [odometerAtService, setOdometerAtService] = useState<number>(0);
  const [serviceDate, setServiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cost, setCost] = useState<number>(0);
  const [technician, setTechnician] = useState<string>('');
  const [details, setDetails] = useState<{ taskCode: string; status: string; notes: string }[]>([]);

  /** COMPLIANCE HIERARCHY DUAL STATE */
  const systemRecommended: ServiceType = getRecommendedService(odometerAtService, isMining);
  const [userSelected, setUserSelected] = useState<ServiceType>('BASIC_10K');
  const serviceMode: ServiceMode = deriveServiceMode(userSelected, systemRecommended);

  /** Confirmation modal state (PARTIAL_EXECUTION gate) */
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

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

  // Sync odometer from unit selection; init userSelected from systemRecommended
  useEffect(() => {
    if (selectedUnit) {
      const unit = units.find((u) => u.id === selectedUnit);
      if (unit) {
        const initialOdo = unit.odometer || 0;
        setOdometerAtService(initialOdo);
        // Initialize userSelected to system recommendation on unit load
        setUserSelected(getRecommendedService(initialOdo, isMining));
      }
    }
  }, [selectedUnit, units]);

  // Sync userSelected when isMining toggle changes (keep in compliance by default)
  useEffect(() => {
    setUserSelected(getRecommendedService(odometerAtService, isMining));
  }, [isMining]);

  // Fetch template reactively
  useEffect(() => {
    if (selectedUnit && userSelected) {
      setLoading(true);
      api
        .get(
          `/maintenance/template/${selectedUnit}?isMining=${isMining}&serviceType=${userSelected}&odometer=${odometerAtService}`
        )
        .then((res) => {
          if (res.data.success) {
            setTemplate(res.data.tasks);
            setDetails(
              res.data.tasks.map((t: MaintenanceTemplateTask) => ({
                taskCode: t.code,
                status: 'PASS',
                notes: '',
              }))
            );
          }
        })
        .finally(() => setLoading(false));
    }
  }, [selectedUnit, isMining, userSelected, odometerAtService]);

  const unitOptions: SelectOption[] = units.map((u) => ({
    value: u.id,
    label: `${u.id} - ${u.marca || ''} ${u.modelo || ''}`.trim(),
    secondaryLabel: `ODO: ${Number(u.odometer || 0).toLocaleString()} KM | ${
      u.placas || 'Sin placas'
    }`,
    searchTerms: `${u.marca || ''} ${u.modelo || ''} ${u.placas || ''} ${u.departamento || ''}`,
  }));

  // Sovereign Dynamic Service Type options with compliance badges
  const getServiceSecondaryLabel = (isRec: boolean, m: ServiceMode): string => {
    if (isRec) return 'RECOMENDADO — CUMPLIMIENTO TOTAL';
    if (m === 'PARTIAL_EXECUTION') return '⚡ EJECUCIÓN PARCIAL';
    return 'PREVENTIVO';
  };
  const serviceTypeOptions: SelectOption[] = (
    ['BASIC_10K', 'INTERMEDIATE_20K', 'MAJOR_30K', 'ADVANCED_50K', 'MINOR_MINING'] as ServiceType[]
  ).map((type) => {
    const isRecommended = type === systemRecommended;
    const mode = deriveServiceMode(type, systemRecommended);
    return {
      value: type,
      label: SERVICE_LABELS[type] + (isRecommended ? ' ✨' : ''),
      secondaryLabel: getServiceSecondaryLabel(isRecommended, mode),
    };
  });

  const statusOptions: SelectOption[] = [
    { value: 'PASS', label: 'Correcto' },
    { value: 'REPLACED', label: 'Reemplazado' },
    { value: 'FAIL', label: 'Falla / Revisi�n' },
    { value: 'N_A', label: 'No Aplica' },
  ];

  const technicianOptions: SelectOption[] = (users || [])
    .filter(
      (u) =>
        u.is_active &&
        (u.roleName?.toLowerCase().includes('t�cnico especialista') ||
          u.roleName?.toLowerCase().includes('tecnico especialista'))
    )
    .map((u) => ({
      value: u.fullName || u.username,
      label: u.fullName || u.username,
      secondaryLabel: `N�MINA: ${u.employeeNumber || 'S/N'} | ${u.department || 'GENERAL'}`,
      searchTerms: `${u.fullName || ''} ${u.username || ''} ${u.employeeNumber || ''}`,
    }));

  const handleDetailChange = (index: number, field: string, value: string): void => {
    const newDetails = [...details];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setDetails(newDetails);
  };

  /** Internal submit logic � called after confirmation if needed */
  const executeSubmit = async (): Promise<void> => {
    setSubmitting(true);
    try {
      const payload: MaintenanceSchedulePayload = {
        unitId: selectedUnit,
        serviceDate,
        odometerAtService: Number(odometerAtService),
        cost: Number(cost),
        technician,
        serviceType: userSelected,
        serviceMode,
        systemRecommendedType: systemRecommended,
        details: details.map((d) => ({
          taskCode: d.taskCode,
          status: d.status as 'PASS' | 'FAIL' | 'REPLACED' | 'N_A',
          notes: d.notes || undefined,
        })),
      };
      const res = await api.post('/maintenance', payload);
      if (res.data.success) onSuccess();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    // PARTIAL_EXECUTION gate: require explicit confirmation before persisting
    if (serviceMode === 'PARTIAL_EXECUTION') {
      setShowConfirmModal(true);
      return;
    }
    await executeSubmit();
  };

  const canSubmit = Boolean(
    selectedUnit && technician && odometerAtService && odometerAtService > 0
  );

  const inputClass =
    'w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-[13px] font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-[13px] placeholder:font-sans placeholder:tracking-normal outline-none';

  return (
    <>
      {/* ╔ PARTIAL_EXECUTION CONFIRMATION MODAL ════════════════════ */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 max-w-md w-full mx-4 overflow-hidden">
            {/* Modal header */}
            <div className="bg-amber-50 border-b border-amber-200 px-7 py-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                <ShieldAlert size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] font-black text-amber-700 uppercase tracking-[0.15em]">
                  Confirmar Ejecuci�n Parcial
                </p>
                <p className="text-[10px] text-amber-600/70 font-mono mt-0.5">
                  PARTIAL_EXECUTION � Trazabilidad Forense Requerida
                </p>
              </div>
            </div>
            {/* Modal body */}
            <div className="px-7 py-6 space-y-4">
              <p className="text-[13px] text-[#0f2a44] font-medium leading-relaxed">
                El sistema recomienda{' '}
                <strong className="text-amber-700">{SERVICE_LABELS[systemRecommended]}</strong>{' '}
                seg�n odometr�a, pero ha seleccionado ejecutar{' '}
                <strong className="text-[#0f2a44]">{SERVICE_LABELS[userSelected]}</strong>.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-[11px] font-black text-amber-700 uppercase tracking-wider mb-1">
                  Consecuencia registrada:
                </p>
                <p className="text-[11px] text-amber-600/90 leading-relaxed">
                  El registro quedar� con estado{' '}
                  <span className="font-black font-mono">PARTIAL_EXECUTION</span>. El preventivo
                  mayor permanecer� como{' '}
                  <span className="font-black font-mono">PENDING_MAINTENANCE</span> en el historial
                  del activo y ser� visible en las alertas de deuda t�cnica.
                </p>
              </div>
              <p className="text-[11px] text-[#0f2a44]/50 font-mono">
                T�cnico responsable:{' '}
                <strong className="text-[#0f2a44]/70">{technician || '�'}</strong>
              </p>
            </div>
            {/* Modal actions */}
            <div className="px-7 pb-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={(): void => setShowConfirmModal(false)}
                className="btn-sentinel-red w-full"
              >
                <X size={14} />
                Regresar
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={(): void => {
                  setShowConfirmModal(false);
                  executeSubmit().catch(() => undefined);
                }}
                className="h-11 flex items-center justify-center gap-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-black uppercase tracking-wider transition-all duration-200 disabled:opacity-50"
              >
                <ShieldAlert size={14} />
                {submitting ? 'Procesando...' : 'Confirmar Parcial'}
              </button>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-20 space-y-8"
      >
        {/* ── COMPLIANCE MODE INDICATOR BANNER ────────────────────────────────── */}
        {selectedUnit && serviceMode === 'PARTIAL_EXECUTION' && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-400/40">
            <AlertTriangle size={17} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] font-black text-amber-700 uppercase tracking-[0.15em] mb-1">
                ⚠️ EJECUCIÓN PARCIAL — PREVENTIVO MAYOR PENDIENTE
              </p>
              <p className="text-[11px] text-amber-600/80 leading-relaxed">
                Odometría recomienda{' '}
                <strong className="font-mono">{SERVICE_LABELS[systemRecommended]}</strong>. Al
                confirmar, este registro queda como{' '}
                <strong className="font-mono">PARTIAL_EXECUTION</strong> y el preventivo mayor
                permanece como deuda técnica del activo.
              </p>
            </div>
          </div>
        )}
        {selectedUnit && serviceMode === 'FULL_COMPLIANCE' && userSelected !== 'MINOR_MINING' && (
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <p className="text-[11px] font-black text-emerald-700 uppercase tracking-[0.15em]">
              ✅ CUMPLIMIENTO TOTAL — Servicio al nivel recomendado por odometría
            </p>
          </div>
        )}
        {/* ── 2-COLUMN SOVEREIGN LAYOUT ────────────────────────────────────── */}
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
                  value={userSelected}
                  onChange={(val: string): void => setUserSelected(val as ServiceType)}
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
                  <span className="text-[13px] font-bold text-[#0f2a44]">
                    Servicio Menor — Mina
                  </span>
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
                      value={odometerAtService || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                        setOdometerAtService(e.target.valueAsNumber)
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
                    value={serviceDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      setServiceDate(e.target.value)
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
                <ArchonSelect
                  options={technicianOptions}
                  value={technician}
                  onChange={(val: string): void => setTechnician(val)}
                  placeholder="Buscar técnico..."
                  icon={User}
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
                    value={cost || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      setCost(e.target.valueAsNumber)
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
        {/* ── CHECKLIST OPERATIVO (Full Width) ─────────────────────────────── */}
        {selectedUnit && (
          <div className="card-archon-sovereign bg-white relative z-0 [--card-accent:#0f2a44] !pb-2">
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
                    className="px-10 py-5 archon-grid-2-sovereign gap-10 items-center hover:bg-[#0f2a44]/[0.02] transition-colors duration-200"
                  >
                    <div className="min-w-0 pr-6">
                      <div className="text-[13px] font-bold text-[#0f2a44] truncate">
                        {task.label}
                      </div>
                      <div className="text-[9px] font-black text-[#0f2a44]/30 uppercase tracking-[0.15em] mt-0.5">
                        {task.code}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="w-full">
                        <ArchonSelect
                          options={statusOptions}
                          value={details[idx]?.status || 'PASS'}
                          onChange={(val: string): void => handleDetailChange(idx, 'status', val)}
                          searchable={false}
                        />
                      </div>
                      <div className="w-full">
                        <input
                          type="text"
                          placeholder="Notas..."
                          value={details[idx]?.notes || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                            handleDetailChange(idx, 'notes', e.target.value)
                          }
                          className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white px-4 rounded-[4px] text-[13px] font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-[13px] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SOVEREIGN ACTION BAR ────────────────────────────────────────── */}
        <div className="archon-grid-2-sovereign gap-10 !mt-5 pt-0">
          <div></div>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={onCancel} className="btn-sentinel-red w-full">
              <X size={14} />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className={`w-full h-11 flex items-center justify-center gap-2 px-4 rounded-lg text-[12px] font-black uppercase tracking-wider transition-all duration-200 disabled:opacity-50 ${
                serviceMode === 'PARTIAL_EXECUTION'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'btn-sentinel-emerald'
              }`}
            >
              {serviceMode === 'PARTIAL_EXECUTION' ? (
                <>
                  <ShieldAlert size={14} /> {submitting ? 'Procesando...' : 'Asentar Parcial'}
                </>
              ) : (
                <>
                  <Save size={14} /> {submitting ? 'Procesando...' : 'Asentar Servicio'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default MaintenanceRegistrationForm;

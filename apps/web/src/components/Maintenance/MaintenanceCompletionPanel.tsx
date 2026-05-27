import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Gauge,
  DollarSign,
  Calendar,
  User,
  ClipboardCheck,
  X,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import {
  MaintenanceLog,
  MaintenanceCompletionPayload,
  MaintenanceTemplateTask,
  ServiceType,
  ServiceMode,
} from '../../types/maintenance';
import api from '../../api/client';
import ArchonField from '../ArchonField';
import ArchonSelect, { SelectOption } from '../ArchonSelect';
import { useUsers } from '../../context/UserContext';

interface MaintenanceCompletionPanelProps {
  log: MaintenanceLog;
  onSuccess: () => void;
  onCancel: () => void;
}

const SERVICE_LABELS: Record<ServiceType, string> = {
  BASIC_10K: 'Básico 10,000 km',
  INTERMEDIATE_20K: 'Intermedio 20,000 km',
  MAJOR_30K: 'Mayor 30,000 km',
  ADVANCED_50K: 'Avanzado 50,000 km',
  MINOR_MINING: 'Servicio Menor — Mina',
};

const SERVICE_MODE_LABELS: Record<ServiceMode, string> = {
  FULL_COMPLIANCE: 'Cumplimiento Total',
  PARTIAL_EXECUTION: 'Ejecución Parcial',
};

const statusOptions: SelectOption[] = [
  { value: 'PASS', label: 'Correcto' },
  { value: 'REPLACED', label: 'Reemplazado' },
  { value: 'FAIL', label: 'Falla / Revisión' },
  { value: 'N_A', label: 'No Aplica' },
  { value: 'DEFERRED', label: 'Diferido — Próxima Orden' },
];

const MaintenanceCompletionPanel: React.FC<MaintenanceCompletionPanelProps> = ({
  log,
  onSuccess,
  onCancel,
}) => {
  const { users } = useUsers();
  const [odometerAtService, setOdometerAtService] = useState<number>(
    Number(log.odometer_at_service) || 0
  );
  const [cost, setCost] = useState<number>(Number(log.cost) || 0);
  const [technician, setTechnician] = useState<string>(log.technician || '');
  const [serviceDate, setServiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [template, setTemplate] = useState<MaintenanceTemplateTask[]>([]);
  const [details, setDetails] = useState<{ taskCode: string; status: string; notes: string }[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingTemplate(true);
    api
      .get(`/maintenance/template/${log.unit_id}?odometer=${log.odometer_at_service}`)
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
      .finally(() => setLoadingTemplate(false));
  }, [log.unit_id, log.odometer_at_service]);

  const technicianOptions: SelectOption[] = (users || [])
    .filter(
      (u) =>
        u.is_active &&
        (u.roleName?.toLowerCase().includes('técnico especialista') ||
          u.roleName?.toLowerCase().includes('tecnico especialista'))
    )
    .map((u) => ({
      value: u.fullName || u.username,
      label: u.fullName || u.username,
      secondaryLabel: `NÓMINA: ${u.employeeNumber || 'S/N'} | ${u.department || 'GENERAL'}`,
      searchTerms: `${u.fullName || ''} ${u.username || ''} ${u.employeeNumber || ''}`,
    }));

  const handleDetailChange = (index: number, field: string, value: string): void => {
    const updated = [...details];
    updated[index] = { ...updated[index], [field]: value };
    setDetails(updated);
  };

  const canSubmit = odometerAtService > 0;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: MaintenanceCompletionPayload = {
        odometerAtService: Number(odometerAtService),
        cost: Number(cost),
        serviceDate,
        technician: technician || undefined,
        details: details.map((d) => ({
          taskCode: d.taskCode,
          status: d.status,
          notes: d.notes || undefined,
        })),
      };
      const res = await api.patch(`/maintenance/${log.uuid}/complete`, payload);
      if (res.data.success) onSuccess();
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'error' in err.response.data
          ? String((err.response.data as { error: unknown }).error)
          : 'Error al cerrar el servicio. Intente de nuevo.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-[13px] font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-[13px] placeholder:font-sans placeholder:tracking-normal outline-none';

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-20 space-y-8"
    >
      {/* ── COMPLETION CONTEXT BANNER ─────────────────────────────────────── */}
      <div className="flex items-start gap-4 px-6 py-5 rounded-xl bg-amber-500/10 border border-amber-400/40">
        <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <Wrench size={18} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black text-amber-700 uppercase tracking-[0.15em] mb-1">
            Cerrar Servicio de Taller — {log.unit_id}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-[11px] text-amber-600/80 font-mono">
              MNT-{String(log.id).padStart(5, '0')}
            </span>
            <span className="text-[11px] text-amber-600/80">
              {SERVICE_LABELS[log.service_type]}
            </span>
            <span
              className={`text-[11px] font-black ${
                log.service_mode === 'PARTIAL_EXECUTION' ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {SERVICE_MODE_LABELS[log.service_mode]}
            </span>
          </div>
        </div>
        {log.service_mode === 'FULL_COMPLIANCE' && (
          <ShieldCheck size={20} className="text-emerald-500 shrink-0 mt-1" />
        )}
      </div>

      {error && (
        <div className="px-5 py-3 rounded-xl bg-red-50 border border-red-200 text-[12px] font-bold text-red-700">
          {error}
        </div>
      )}

      {/* ── 2-COLUMN GRID ─────────────────────────────────────────────────── */}
      <div className="archon-grid-2-sovereign items-start gap-10 relative z-30">
        {/* PANEL: DATOS DE CIERRE */}
        <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 relative z-20 [--card-accent:#f2b705]">
          <div className="card-sovereign-header">
            <Gauge className="text-[var(--card-accent)]" size={22} />
            <h3 className="card-sovereign-title text-[14px] opacity-100">DATOS DE CIERRE</h3>
          </div>
          <div className="space-y-6 relative z-10">
            <ArchonField label="Odómetro de Salida" icon={Gauge} required>
              <div className="relative flex items-center">
                <input
                  required
                  type="number"
                  min={0}
                  placeholder="Ej: 126500"
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
              <p className="text-[10px] text-slate-400 mt-1 font-mono pl-1">
                Entrada: {Number(log.odometer_at_service).toLocaleString()} km
              </p>
            </ArchonField>
            <ArchonField label="Fecha de Cierre" icon={Calendar}>
              <input
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

        {/* PANEL: CONFIRMACIÓN FINANCIERA */}
        <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 relative z-20 [--card-accent:#f2b705]">
          <div className="card-sovereign-header">
            <ClipboardCheck className="text-[var(--card-accent)]" size={22} />
            <h3 className="card-sovereign-title text-[14px] opacity-100">CONFIRMACIÓN FINAL</h3>
          </div>
          <div className="space-y-6 relative z-10">
            <ArchonField label="Técnico Ejecutor" icon={User}>
              <ArchonSelect
                options={technicianOptions}
                value={technician}
                onChange={(val: string): void => setTechnician(val)}
                placeholder="Confirmar técnico..."
                icon={User}
              />
            </ArchonField>
            <ArchonField label="Costo Final del Servicio" icon={DollarSign}>
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

      {/* ── CHECKLIST DE CIERRE ───────────────────────────────────────────── */}
      <div className="card-archon-sovereign bg-white relative z-0 [--card-accent:#f2b705] !pb-2">
        <div className="card-sovereign-header p-10 pb-0">
          <ClipboardCheck className="text-[var(--card-accent)]" size={22} />
          <h3 className="card-sovereign-title text-[14px] opacity-100">CHECKLIST DE CIERRE</h3>
        </div>
        {loadingTemplate && (
          <div className="p-12 text-center text-[10px] font-black text-[#0f2a44]/40 uppercase tracking-[0.2em]">
            Generando matriz de inspección...
          </div>
        )}
        {!loadingTemplate && template.length === 0 && (
          <div className="p-12 text-center text-[10px] font-black text-[#0f2a44]/30 uppercase tracking-[0.2em]">
            No se encontraron tareas para este servicio.
          </div>
        )}
        {!loadingTemplate && template.length > 0 && (
          <div className="divide-y divide-[#0f2a44]/5">
            {template.map((task, idx) => (
              <div
                key={task.code}
                className="px-10 py-5 archon-grid-2-sovereign gap-10 items-center hover:bg-[#0f2a44]/[0.02] transition-colors duration-200"
              >
                <div className="min-w-0 pr-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-[13px] font-bold text-[#0f2a44]">{task.label}</div>
                    {task.isDeferredCarry && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-400/30 text-[9px] font-black text-amber-600 uppercase tracking-[0.1em]">
                        ↩ Diferido
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] font-black text-[#0f2a44]/30 uppercase tracking-[0.15em] mt-0.5">
                    {task.code}
                    {task.isCritical && <span className="ml-2 text-red-500">● CRÍTICO</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ArchonSelect
                    options={statusOptions}
                    value={details[idx]?.status || 'PASS'}
                    onChange={(val: string): void => handleDetailChange(idx, 'status', val)}
                    searchable={false}
                  />
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
            ))}
          </div>
        )}
      </div>

      {/* ── ACTION BAR ────────────────────────────────────────────────────── */}
      <div className="archon-grid-2-sovereign gap-10 !mt-5 pt-0">
        <div />
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={onCancel} className="btn-sentinel-red w-full">
            <X size={14} />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="w-full h-11 flex items-center justify-center gap-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-black uppercase tracking-wider transition-all duration-200 disabled:opacity-50"
          >
            <CheckCircle2 size={14} />
            {submitting ? 'Cerrando...' : 'Finalizar Servicio'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default MaintenanceCompletionPanel;

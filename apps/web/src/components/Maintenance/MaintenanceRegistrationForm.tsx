import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Truck,
  Calendar,
  Gauge,
  DollarSign,
  User,
  ClipboardCheck,
  Save,
  X,
  Warehouse,
  Droplets,
  ListChecks,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  MaintenanceSchedulePayload,
  UpaPreviewTask,
  UpaPackageLevel,
  UpaTaskStage,
} from '../../types/maintenance';

import api from '../../api/client';
import { FleetUnit } from '../../types/fleet';
import ArchonField from '../ArchonField';
import ArchonSelect, { SelectOption } from '../ArchonSelect';
import { useUsers } from '../../context/UserContext';
import ArchonFuelSensor from '../Routes/ArchonFuelSensor';
import { MAINTENANCE } from '../../constants/maintenance';

interface MaintenanceRegistrationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialUnitId?: string;
}

const getUpaBadgeInfo = (
  isMine: boolean,
  level: UpaPackageLevel | null
): { label: string; style: string } => {
  if (isMine)
    return {
      label: 'Servicio Menor',
      style: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    };
  if (level === '50k')
    return {
      label: 'Avanzado 50,000 km',
      style: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    };
  if (level === '30k')
    return {
      label: 'Mayor 30,000 km',
      style: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
    };
  if (level === '20k')
    return {
      label: 'Intermedio 20,000 km',
      style: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    };
  if (level === '10k')
    return { label: 'Básico 10,000 km', style: 'bg-sky-500/10 text-sky-700 border-sky-500/20' };
  return {
    label: 'Triaje + Menor (Sin Cascada)',
    style: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  };
};

const UPA_STAGE_ORDER: UpaTaskStage[] = [
  'triage',
  'minor_service',
  'cascade',
  'deferred',
  'closure',
];

const UPA_STAGE_LABELS: Record<UpaTaskStage, string> = {
  triage: 'Triaje',
  minor_service: 'Servicio Menor',
  cascade: 'Cascada',
  deferred: 'Diferidos',
  closure: 'Cierre',
};

const getSubmitBtnClass = (inProgress: boolean): string =>
  inProgress ? 'bg-[#0f2a44] hover:bg-[#1a3d5c] text-white' : 'btn-sentinel-emerald';

const getSubmitLabel = (inProgress: boolean, isSubmitting: boolean): string => {
  if (isSubmitting) return 'Procesando...';
  return inProgress ? 'Registrar en Taller' : 'Asentar Servicio';
};

interface FuelSectionProps {
  isInProgress: boolean;
  unit: FleetUnit | undefined;
  fuelLevelEnd: number;
  onFuelLevelEnd: (v: number) => void;
  endOdometer: number;
  onEndOdometer: (v: number) => void;
  odometerAtService: number;
  fuelLitersLoaded: string;
  onFuelLitersLoaded: (v: string) => void;
  fuelAmount: string;
  onFuelAmount: (v: string) => void;
  inputClass: string;
}

const FuelSection: React.FC<FuelSectionProps> = ({
  isInProgress,
  unit,
  fuelLevelEnd,
  onFuelLevelEnd,
  endOdometer,
  onEndOdometer,
  odometerAtService,
  fuelLitersLoaded,
  onFuelLitersLoaded,
  fuelAmount,
  onFuelAmount,
  inputClass,
}) => (
  <div className="archon-grid-2-sovereign items-start gap-10">
    {/* CARD IZQ — Sensor de nivel */}
    <div className="card-archon-sovereign bg-white p-10 space-y-8 [--card-accent:#f2b705]">
      <div className="card-sovereign-header">
        <Droplets className="text-[var(--card-accent)]" size={22} />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">
          {isInProgress ? 'NIVEL DE SALIDA' : 'NIVEL DE COMBUSTIBLE'}
        </h3>
      </div>
      <div className="space-y-3">
        <ArchonFuelSensor
          value={fuelLevelEnd}
          onChange={isInProgress ? (): void => undefined : onFuelLevelEnd}
          disabled={isInProgress}
        />
        {isInProgress && (
          <p className="text-archon-base text-[#0f2a44]/40 italic pt-1">
            Nivel auto-heredado del sistema. El nivel de retorno se captura al cerrar el servicio.
          </p>
        )}
      </div>
    </div>

    {/* CARD DER — Datos numéricos */}
    <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 [--card-accent:#f2b705]">
      <div className="card-sovereign-header">
        <Gauge className="text-[var(--card-accent)]" size={22} />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">
          {isInProgress ? 'ESTADO DE SALIDA' : 'DATOS DE SALIDA'}
        </h3>
      </div>

      {!isInProgress ? (
        <div className="space-y-6">
          <ArchonField label="Odómetro de Salida" icon={Gauge}>
            <div className="relative flex items-center">
              <input
                type="number"
                min={odometerAtService}
                placeholder="Ej: 125180"
                className={`${inputClass} font-mono pr-14`}
                value={endOdometer || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  onEndOdometer(e.target.valueAsNumber)
                }
              />
              <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                KM
              </span>
            </div>
            <p className="text-archon-base text-slate-400 mt-1 font-mono pl-1">
              Incluye traslado y pruebas de campo
            </p>
          </ArchonField>
          <ArchonField label="Litros Cargados" icon={Droplets}>
            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                className={`${inputClass} font-mono pr-14`}
                value={fuelLitersLoaded}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  onFuelLitersLoaded(e.target.value.replace(/[^0-9.]/g, ''))
                }
              />
              <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                LTS
              </span>
            </div>
          </ArchonField>
          <ArchonField label="Monto del Ticket de Combustible" icon={DollarSign}>
            <div className="flex items-center w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus-within:border-b-[#f2b705] focus-within:bg-white focus-within:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] transition-all duration-300">
              <span className="text-[#0f2a44]/40 font-bold text-archon-lg">$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                className="flex-1 w-full bg-transparent px-2 py-0 border-none outline-none focus:ring-0 text-archon-lg font-mono text-emerald-600 font-bold placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal"
                value={fuelAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  onFuelAmount(e.target.value.replace(/[^0-9.]/g, ''))
                }
              />
              <span className="text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                MXN
              </span>
            </div>
          </ArchonField>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Gauge size={14} className="text-[#0f2a44]/30 shrink-0" />
            <span className="font-mono text-archon-lg font-bold text-[#0f2a44]">
              {Number(unit?.odometer ?? 0).toLocaleString()} km
            </span>
          </div>
          <p className="text-archon-base text-[#0f2a44]/40">
            Odómetro de entrada y nivel de combustible se registran automáticamente. Al retorno del
            taller, capture el odómetro final y nivel en el formulario de cierre.
          </p>
        </div>
      )}
    </div>
  </div>
);

const MaintenanceRegistrationForm: React.FC<MaintenanceRegistrationFormProps> = ({
  onSuccess,
  onCancel,
  initialUnitId,
}) => {
  const [units, setUnits] = useState<FleetUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>(initialUnitId ?? '');
  const { users } = useUsers();

  const [odometerAtService, setOdometerAtService] = useState<number>(0);
  const [endOdometer, setEndOdometer] = useState<number>(0);
  const [serviceDate, setServiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cost, setCost] = useState<number>(0);
  const [technician, setTechnician] = useState<string>('');
  const [details, setDetails] = useState<{ taskCode: string; status: string; notes: string }[]>([]);
  const [fuelLevelEnd, setFuelLevelEnd] = useState<number>(50);
  const [fuelLitersLoaded, setFuelLitersLoaded] = useState<string>('');
  const [fuelAmount, setFuelAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [upaPreview, setUpaPreview] = useState<UpaPreviewTask[] | null>(null);
  const [upaPreviewLoading, setUpaPreviewLoading] = useState(false);
  const [openPreviewStages, setOpenPreviewStages] = useState<Record<string, boolean>>({
    triage: true,
    minor_service: false,
    cascade: false,
    deferred: false,
    closure: false,
  });

  const unit = units.find((u) => u.id === selectedUnit);
  const isMineUnit =
    Number(unit?.maintIntervalKm ?? MAINTENANCE.AGENCY_DEFAULT_INTERVAL_KM) ===
    MAINTENANCE.MINE_UNIT_INTERVAL_KM;
  // MINE units → In Situ; all agency milestones → Taller (Downtime)
  const isInProgress = !isMineUnit;
  const cascadeLevel: UpaPackageLevel | null = ((): UpaPackageLevel | null => {
    if (!upaPreview) return null;
    const levels: UpaPackageLevel[] = ['50k', '30k', '20k', '10k'];
    return (
      levels.find((lvl) =>
        upaPreview.some((t) => t.stage === 'cascade' && t.packageLevel === lvl)
      ) ?? null
    );
  })();
  const upaBadge = getUpaBadgeInfo(isMineUnit, cascadeLevel);

  useEffect(() => {
    api.get('/fleet').then((res) => {
      if (res.data.success) {
        setUnits(res.data.data.filter((u: FleetUnit) => u.status !== 'Descontinuada'));
      }
    });
  }, []);

  useEffect(() => {
    if (selectedUnit && unit) {
      setOdometerAtService(unit.odometer || 0);
      setEndOdometer(unit.odometer || 0);
      setFuelLevelEnd(Number(unit.lastFuelLevel ?? 50));
    }
  }, [selectedUnit, units]);

  useEffect(() => {
    if (!selectedUnit) {
      setUpaPreview(null);
      return;
    }
    setUpaPreviewLoading(true);
    api
      .get(`/work-orders/preview/${selectedUnit}?fleetType=urban`)
      .then((res) => {
        if (res.data.success) setUpaPreview(res.data.data.tasks as UpaPreviewTask[]);
      })
      .catch(() => setUpaPreview(null))
      .finally(() => setUpaPreviewLoading(false));
  }, [selectedUnit]);

  useEffect(() => {
    if (upaPreview && upaPreview.length > 0) {
      setDetails(upaPreview.map((t) => ({ taskCode: t.id, status: 'PASS', notes: '' })));
    } else {
      setDetails([]);
    }
  }, [upaPreview]);

  const unitOptions: SelectOption[] = units.map((u) => ({
    value: u.id,
    label: `${u.id} - ${u.marca || ''} ${u.modelo || ''}`.trim(),
    secondaryLabel: `ODO: ${Number(u.odometer || 0).toLocaleString()} KM | ${
      u.placas || 'Sin placas'
    }`,
    searchTerms: `${u.marca || ''} ${u.modelo || ''} ${u.placas || ''} ${u.departamento || ''}`,
  }));

  const upaStatusOptions: SelectOption[] = [
    { value: 'PASS', label: 'Tarea Aprobada' },
    { value: 'N_A', label: 'No Aplica' },
    { value: 'DEFERRED', label: 'Diferido Próxima Orden' },
  ];

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

  const handleUpaDetailChange = (taskId: string, value: string): void => {
    setDetails((prev) => prev.map((d) => (d.taskCode === taskId ? { ...d, status: value } : d)));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: MaintenanceSchedulePayload = {
        unitId: selectedUnit,
        serviceDate,
        odometerAtService: Number(odometerAtService),
        cost: Number(cost),
        technician,
        details: details.map((d) => ({
          taskCode: d.taskCode,
          status: d.status,
          notes: d.notes || undefined,
        })),
        is_in_progress: isInProgress,
        ...(isInProgress
          ? {}
          : {
              fuelLevelEnd,
              fuelLitersLoaded: fuelLitersLoaded ? Number(fuelLitersLoaded) : undefined,
              fuelAmount: fuelAmount ? Number(fuelAmount) : undefined,
              endOdometer: endOdometer > odometerAtService ? endOdometer : undefined,
            }),
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

  const canSubmit = Boolean(
    selectedUnit && technician && odometerAtService && odometerAtService > 0
  );

  const inputClass =
    'w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal outline-none';

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-20 space-y-8"
    >
      {/* ── MODO DE REGISTRO (automático) ──────────────────────────────────── */}
      {selectedUnit && (
        <div
          className={`flex items-center gap-3 px-5 py-3.5 rounded-[4px] border ${
            isInProgress
              ? 'bg-amber-500/10 border-amber-400/40'
              : 'bg-emerald-500/10 border-emerald-400/30'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isInProgress ? 'bg-amber-500/15' : 'bg-emerald-500/15'
            }`}
          >
            {isInProgress ? (
              <Warehouse size={14} className="text-amber-600" />
            ) : (
              <Wrench size={14} className="text-emerald-600" />
            )}
          </div>
          <div>
            <p
              className={`text-archon-md font-black uppercase tracking-[0.15em] ${
                isInProgress ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {isInProgress ? 'Ingreso a Taller — Downtime' : 'In Situ — Registro Inmediato'}
            </p>
            <p
              className={`text-archon-base mt-0.5 ${
                isInProgress ? 'text-amber-600/70' : 'text-emerald-600/70'
              }`}
            >
              {isInProgress
                ? 'La unidad entrará en Downtime. Cierre el servicio cuando esté listo.'
                : 'Servicio en campo. La unidad regresa a Disponible al guardar.'}
            </p>
          </div>
        </div>
      )}

      {/* ── 2-COLUMN SOVEREIGN LAYOUT ──────────────────────────────────────── */}
      <div className="archon-grid-2-sovereign items-start gap-10 relative z-30">
        {/* PANEL 1: CONFIGURACIÓN DE SERVICIO */}
        <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 relative z-20 [--card-accent:#0f2a44]">
          <div className="card-sovereign-header">
            <Wrench className="text-[var(--card-accent)]" size={22} />
            <h3 className="card-sovereign-title text-archon-xl opacity-100">CONFIGURACIÓN</h3>
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

            {/* Service type badge — derived from UPA engine preview */}
            {selectedUnit && (isMineUnit || (upaPreview !== null && !upaPreviewLoading)) && (
              <div className="space-y-1.5">
                <p className="text-archon-base font-black text-[#0f2a44]/50 uppercase tracking-[0.15em]">
                  Tipo de Servicio (UPA)
                </p>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-archon-md font-black uppercase tracking-wider ${upaBadge.style}`}
                >
                  <Wrench size={11} />
                  {upaBadge.label}
                </div>
              </div>
            )}

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
                  <span className="absolute right-4 text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
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

        {/* PANEL 2: DATOS OPERATIVOS */}
        <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 relative z-20 [--card-accent:#0f2a44]">
          <div className="card-sovereign-header">
            <ClipboardCheck className="text-[var(--card-accent)]" size={22} />
            <h3 className="card-sovereign-title text-archon-xl opacity-100">DATOS OPERATIVOS</h3>
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
                <span className="text-[#0f2a44]/40 font-bold text-archon-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej: 3,450.00"
                  className="flex-1 w-full bg-transparent px-2 py-0 border-none outline-none focus:ring-0 text-archon-lg font-mono text-emerald-600 font-bold placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-archon-lg placeholder:font-sans placeholder:tracking-normal"
                  value={cost || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setCost(e.target.valueAsNumber)
                  }
                />
                <span className="text-archon-base font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                  MXN
                </span>
              </div>
            </ArchonField>
          </div>
        </div>
      </div>

      {/* ── VISTA PREVIA UPA ─────────────────────────────────────────────────── */}
      {selectedUnit && (
        <div className="card-archon-sovereign bg-white relative z-0 [--card-accent:#7c3aed]">
          <div className="card-sovereign-header p-10 pb-6">
            <ListChecks className="text-[var(--card-accent)]" size={22} />
            <h3 className="card-sovereign-title text-archon-xl opacity-100">
              REVISIÓN DE TAREAS UPA
            </h3>
          </div>
          {upaPreviewLoading && (
            <div className="px-10 pb-10 text-center text-archon-base font-black text-[#0f2a44]/40 uppercase tracking-[0.2em]">
              Calculando tareas UPA...
            </div>
          )}
          {!upaPreviewLoading && upaPreview !== null && upaPreview.length === 0 && (
            <div className="px-10 pb-10 text-center text-archon-base font-black text-[#0f2a44]/30 uppercase tracking-[0.2em]">
              Sin tareas UPA para esta unidad.
            </div>
          )}
          {!upaPreviewLoading && upaPreview !== null && upaPreview.length > 0 && (
            <div className="px-10 pb-10 space-y-2">
              {UPA_STAGE_ORDER.filter((stage) => upaPreview.some((t) => t.stage === stage)).map(
                (stage) => {
                  const stageTasks = upaPreview.filter((t) => t.stage === stage);
                  const isOpen = openPreviewStages[stage] ?? false;
                  return (
                    <div
                      key={stage}
                      className="border border-[#0f2a44]/10 rounded-[4px] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={(): void =>
                          setOpenPreviewStages((prev) => ({ ...prev, [stage]: !isOpen }))
                        }
                        className="w-full flex items-center justify-between px-5 py-3.5 bg-[#0f2a44]/[0.03] hover:bg-[#0f2a44]/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-archon-md font-black text-[#7c3aed] uppercase tracking-[0.15em]">
                            {UPA_STAGE_LABELS[stage]}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#7c3aed]/10 text-[#7c3aed] text-archon-sm font-black">
                            {stageTasks.length}
                          </span>
                        </div>
                        {isOpen ? (
                          <ChevronUp size={14} className="text-[#0f2a44]/40 shrink-0" />
                        ) : (
                          <ChevronDown size={14} className="text-[#0f2a44]/40 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="divide-y divide-[#0f2a44]/5">
                          {stageTasks.map((task) => (
                            <div
                              key={task.id}
                              className="px-5 py-3.5 flex items-center gap-4 hover:bg-[#0f2a44]/[0.02] transition-colors duration-200"
                            >
                              <span className="flex-1 text-archon-base text-[#0f2a44]/80 min-w-0">
                                {task.description}
                              </span>
                              <div className="w-52 shrink-0">
                                <ArchonSelect
                                  options={upaStatusOptions}
                                  value={
                                    details.find((d) => d.taskCode === task.id)?.status ?? 'PASS'
                                  }
                                  onChange={(val: string): void =>
                                    handleUpaDetailChange(task.id, val)
                                  }
                                  searchable={false}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TELEMETRÍA DE COMBUSTIBLE ──────────────────────────────────────── */}
      {selectedUnit && (
        <FuelSection
          isInProgress={isInProgress}
          unit={unit}
          fuelLevelEnd={fuelLevelEnd}
          onFuelLevelEnd={setFuelLevelEnd}
          endOdometer={endOdometer}
          onEndOdometer={setEndOdometer}
          odometerAtService={odometerAtService}
          fuelLitersLoaded={fuelLitersLoaded}
          onFuelLitersLoaded={setFuelLitersLoaded}
          fuelAmount={fuelAmount}
          onFuelAmount={setFuelAmount}
          inputClass={inputClass}
        />
      )}

      {/* ── SOVEREIGN ACTION BAR ────────────────────────────────────────────── */}
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
            className={`w-full h-11 flex items-center justify-center gap-2 px-4 rounded-[4px] text-archon-label font-black uppercase tracking-wider transition-all duration-200 disabled:opacity-50 ${getSubmitBtnClass(
              isInProgress
            )}`}
          >
            {isInProgress ? <Warehouse size={14} /> : <Save size={14} />}
            {getSubmitLabel(isInProgress, submitting)}
          </button>
        </div>
      </div>
    </form>
  );
};

export default MaintenanceRegistrationForm;

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
import { useUsers } from '../../context/UserContext';
import ArchonFuelSensor from '../Routes/ArchonFuelSensor';

interface MaintenanceRegistrationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialUnitId?: string;
}

/**
 * Cyclic service type engine — mirrors backend computeServiceType exactly.
 * mod-60,000 km residue with ±1,000 km tolerance windows.
 */
const computeServiceType = (odometer: number, maintIntervalKm: number | string): ServiceType => {
  if (!odometer || odometer <= 0) return 'BASIC_10K';
  const remainder = odometer % 60000;
  const isMineUnit = Number(maintIntervalKm) === 5000;

  if (remainder <= 1000 || remainder >= 59000) return 'ADVANCED_50K';
  if (remainder >= 49000 && remainder <= 51000) return 'ADVANCED_50K';
  if (remainder >= 29000 && remainder <= 41000) return 'MAJOR_30K';
  if (remainder >= 19000 && remainder <= 21000) return 'INTERMEDIATE_20K';
  if (remainder >= 9000 && remainder <= 11000) return 'BASIC_10K';

  if (isMineUnit) return 'MINOR_MINING';

  const milestones: { type: ServiceType; value: number }[] = [
    { type: 'BASIC_10K', value: 10000 },
    { type: 'INTERMEDIATE_20K', value: 20000 },
    { type: 'MAJOR_30K', value: 30000 },
    { type: 'MAJOR_30K', value: 40000 },
    { type: 'ADVANCED_50K', value: 50000 },
  ];
  let best: ServiceType = 'BASIC_10K';
  let minDist = Infinity;
  milestones.forEach((m) => {
    const dist = Math.abs(remainder - m.value);
    if (dist < minDist) {
      minDist = dist;
      best = m.type;
    }
  });
  return best;
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  BASIC_10K: 'Básico 10,000 km',
  INTERMEDIATE_20K: 'Intermedio 20,000 km',
  MAJOR_30K: 'Mayor 30,000 km',
  ADVANCED_50K: 'Avanzado 50,000 km',
  MINOR_MINING: 'Servicio Menor — Mina',
};

const SERVICE_BADGE_STYLE: Record<ServiceType, { bg: string; text: string; border: string }> = {
  BASIC_10K: { bg: 'bg-sky-500/10', text: 'text-sky-700', border: 'border-sky-500/20' },
  INTERMEDIATE_20K: { bg: 'bg-blue-500/10', text: 'text-blue-700', border: 'border-blue-500/20' },
  MAJOR_30K: { bg: 'bg-violet-500/10', text: 'text-violet-700', border: 'border-violet-500/20' },
  ADVANCED_50K: { bg: 'bg-rose-500/10', text: 'text-rose-700', border: 'border-rose-500/20' },
  MINOR_MINING: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700',
    border: 'border-emerald-500/20',
  },
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
        <h3 className="card-sovereign-title text-[14px] opacity-100">
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
          <p className="text-[10px] text-[#0f2a44]/40 italic pt-1">
            Nivel auto-heredado del sistema. El nivel de retorno se captura al cerrar el servicio.
          </p>
        )}
      </div>
    </div>

    {/* CARD DER — Datos numéricos */}
    <div className="card-archon-sovereign !overflow-visible bg-white p-10 space-y-8 [--card-accent:#f2b705]">
      <div className="card-sovereign-header">
        <Gauge className="text-[var(--card-accent)]" size={22} />
        <h3 className="card-sovereign-title text-[14px] opacity-100">
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
              <span className="absolute right-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                KM
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono pl-1">
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
              <span className="absolute right-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                LTS
              </span>
            </div>
          </ArchonField>
          <ArchonField label="Monto del Ticket de Combustible" icon={DollarSign}>
            <div className="flex items-center w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus-within:border-b-[#f2b705] focus-within:bg-white focus-within:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] transition-all duration-300">
              <span className="text-[#0f2a44]/40 font-bold text-[13px]">$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                className="flex-1 w-full bg-transparent px-2 py-0 border-none outline-none focus:ring-0 text-[13px] font-mono text-emerald-600 font-bold placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-[13px] placeholder:font-sans placeholder:tracking-normal"
                value={fuelAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  onFuelAmount(e.target.value.replace(/[^0-9.]/g, ''))
                }
              />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                MXN
              </span>
            </div>
          </ArchonField>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Gauge size={14} className="text-[#0f2a44]/30 shrink-0" />
            <span className="font-mono text-[13px] font-bold text-[#0f2a44]">
              {Number(unit?.odometer ?? 0).toLocaleString()} km
            </span>
          </div>
          <p className="text-[10px] text-[#0f2a44]/40">
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
  const [template, setTemplate] = useState<MaintenanceTemplateTask[]>([]);
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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const unit = units.find((u) => u.id === selectedUnit);
  const isMineUnit = Number(unit?.maintIntervalKm) === 5000;
  const computedServiceType = computeServiceType(odometerAtService, unit?.maintIntervalKm ?? 10000);
  const badge = SERVICE_BADGE_STYLE[computedServiceType];
  // MINOR_MINING → In Situ; all agency milestones → Taller (Downtime)
  const isInProgress = computedServiceType !== 'MINOR_MINING';

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
    if (!selectedUnit || !odometerAtService || odometerAtService <= 0) return;
    setLoading(true);
    api
      .get(`/maintenance/template/${selectedUnit}?odometer=${odometerAtService}`)
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
  }, [selectedUnit, odometerAtService]);

  const unitOptions: SelectOption[] = units.map((u) => ({
    value: u.id,
    label: `${u.id} - ${u.marca || ''} ${u.modelo || ''}`.trim(),
    secondaryLabel: `ODO: ${Number(u.odometer || 0).toLocaleString()} KM | ${
      u.placas || 'Sin placas'
    }`,
    searchTerms: `${u.marca || ''} ${u.modelo || ''} ${u.placas || ''} ${u.departamento || ''}`,
  }));

  const statusOptions: SelectOption[] = [
    { value: 'PASS', label: 'Correcto' },
    { value: 'REPLACED', label: 'Reemplazado' },
    { value: 'FAIL', label: 'Falla / Revisión' },
    { value: 'N_A', label: 'No Aplica' },
    { value: 'DEFERRED', label: 'Diferido — Próxima Orden' },
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

  const handleDetailChange = (index: number, field: string, value: string): void => {
    const newDetails = [...details];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setDetails(newDetails);
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
    'w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-[13px] font-bold text-[#0f2a44] transition-all duration-300 placeholder:text-[#0f2a44]/30 placeholder:font-normal placeholder:text-[13px] placeholder:font-sans placeholder:tracking-normal outline-none';

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-20 space-y-8"
    >
      {/* ── MODO DE REGISTRO (automático) ──────────────────────────────────── */}
      {selectedUnit && (
        <div
          className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border ${
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
              className={`text-[11px] font-black uppercase tracking-[0.15em] ${
                isInProgress ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {isInProgress ? 'Ingreso a Taller — Downtime' : 'In Situ — Registro Inmediato'}
            </p>
            <p
              className={`text-[10px] mt-0.5 ${
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

            {/* Dynamic service type badge — computed server-side from odometry */}
            {selectedUnit && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-[#0f2a44]/50 uppercase tracking-[0.15em]">
                  Tipo de Servicio (Calculado)
                </p>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-[11px] font-black uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}
                >
                  <Wrench size={11} />
                  {SERVICE_LABELS[computedServiceType]}
                  {isMineUnit && computedServiceType === 'MINOR_MINING' && (
                    <span className="ml-1 opacity-60 font-mono normal-case tracking-normal">
                      · mina
                    </span>
                  )}
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

        {/* PANEL 2: DATOS OPERATIVOS */}
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

      {/* ── CHECKLIST OPERATIVO ─────────────────────────────────────────────── */}
      {selectedUnit && (
        <div className="card-archon-sovereign bg-white relative z-0 [--card-accent:#0f2a44] !pb-2">
          <div className="card-sovereign-header p-10 pb-0">
            <ClipboardCheck className="text-[var(--card-accent)]" size={22} />
            <h3 className="card-sovereign-title text-[14px] opacity-100">
              {isInProgress ? 'INSPECCIÓN DE ENTRADA (Opcional)' : 'CHECKLIST OPERATIVO'}
            </h3>
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
            className={`w-full h-11 flex items-center justify-center gap-2 px-4 rounded-lg text-[12px] font-black uppercase tracking-wider transition-all duration-200 disabled:opacity-50 ${getSubmitBtnClass(
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

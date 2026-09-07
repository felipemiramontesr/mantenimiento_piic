import { useState, useEffect, FormEvent } from 'react';
import {
  MaintenanceSchedulePayload,
  UpaPreviewTask,
  UpaPackageLevel,
} from '../../../types/maintenance';
import api from '../../../api/client';
import { FleetUnit } from '../../../types/fleet';
import { SelectOption } from '../../ArchonSelect';
import { UserIndustrial } from '../../../types/user';
import { getUpaBadgeInfo } from './constants';

/** Catálogo de unidades activas (no descontinuadas)
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function useUnitsCatalog(): FleetUnit[] {
  const [units, setUnits] = useState<FleetUnit[]>([]);

  useEffect(() => {
    api.get('/fleet').then((res) => {
      if (res.data.success) {
        setUnits(res.data.data.filter((u: FleetUnit) => u.status !== 'Descontinuada'));
      }
    });
  }, []);

  return units;
}

interface RegistrationFields {
  odometerAtService: number;
  setOdometerAtService: (n: number) => void;
  endOdometer: number;
  setEndOdometer: (n: number) => void;
  serviceDate: string;
  setServiceDate: (s: string) => void;
  cost: number;
  setCost: (n: number) => void;
  technician: string;
  setTechnician: (s: string) => void;
  fuelLevelEnd: number;
  setFuelLevelEnd: (n: number) => void;
  fuelLitersLoaded: string;
  setFuelLitersLoaded: (s: string) => void;
  fuelAmount: string;
  setFuelAmount: (s: string) => void;
}

/** Campos del formulario + auto-heredado desde la unidad seleccionada
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function useRegistrationFields(
  selectedUnit: string,
  unit: FleetUnit | undefined,
  units: FleetUnit[]
): RegistrationFields {
  const [odometerAtService, setOdometerAtService] = useState<number>(0);
  const [endOdometer, setEndOdometer] = useState<number>(0);
  const [serviceDate, setServiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cost, setCost] = useState<number>(0);
  const [technician, setTechnician] = useState<string>('');
  const [fuelLevelEnd, setFuelLevelEnd] = useState<number>(50);
  const [fuelLitersLoaded, setFuelLitersLoaded] = useState<string>('');
  const [fuelAmount, setFuelAmount] = useState<string>('');

  useEffect(() => {
    if (selectedUnit && unit) {
      setOdometerAtService(unit.odometer || 0);
      setEndOdometer(unit.odometer || 0);
      setFuelLevelEnd(Number(unit.lastFuelLevel ?? 50));
    }
  }, [selectedUnit, units, unit]);

  return {
    odometerAtService,
    setOdometerAtService,
    endOdometer,
    setEndOdometer,
    serviceDate,
    setServiceDate,
    cost,
    setCost,
    technician,
    setTechnician,
    fuelLevelEnd,
    setFuelLevelEnd,
    fuelLitersLoaded,
    setFuelLitersLoaded,
    fuelAmount,
    setFuelAmount,
  };
}

interface RegistrationDetail {
  taskCode: string;
  status: string;
  notes: string;
}

interface UpaPreviewState {
  upaPreview: UpaPreviewTask[] | null;
  upaPreviewLoading: boolean;
  details: RegistrationDetail[];
  handleUpaDetailChange: (taskId: string, value: string) => void;
}

/** Vista previa UPA de la unidad seleccionada + detalles de tarea editables
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function useUpaPreviewState(selectedUnit: string): UpaPreviewState {
  const [upaPreview, setUpaPreview] = useState<UpaPreviewTask[] | null>(null);
  const [upaPreviewLoading, setUpaPreviewLoading] = useState(false);
  const [details, setDetails] = useState<RegistrationDetail[]>([]);

  useEffect(() => {
    if (!selectedUnit) {
      setUpaPreview(null);
      return;
    }
    setUpaPreviewLoading(true);
    api
      .get(`/work-orders/preview/${selectedUnit}`)
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

  const handleUpaDetailChange = (taskId: string, value: string): void => {
    setDetails((prev) => prev.map((d) => (d.taskCode === taskId ? { ...d, status: value } : d)));
  };

  return { upaPreview, upaPreviewLoading, details, handleUpaDetailChange };
}

interface MaintenanceDerived {
  isMineUnit: boolean;
  hasCascadeTasks: boolean;
  isInProgress: boolean;
  upaBadge: { label: string; style: string };
}

/** Deriva modo In Situ/Taller y badge de tipo de servicio a partir de la unidad + preview UPA
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function useMaintenanceDerived(
  unit: FleetUnit | undefined,
  upaPreview: UpaPreviewTask[] | null,
  mineUnitIntervalKm: number,
  agencyDefaultIntervalKm: number
): MaintenanceDerived {
  const isMineUnit =
    Number(unit?.maintIntervalKm ?? agencyDefaultIntervalKm) === mineUnitIntervalKm;
  const hasCascadeTasks = upaPreview?.some((t) => t.stage === 'cascade') ?? false;
  // Mine units without cascade → In Situ; agency milestones + mine cascade → Taller
  const isInProgress = !isMineUnit || hasCascadeTasks;
  const cascadeLevel: UpaPackageLevel | null = ((): UpaPackageLevel | null => {
    if (!upaPreview) return null;
    const levels: UpaPackageLevel[] = ['50k', '30k', '20k', '10k'];
    return (
      levels.find((lvl) =>
        upaPreview.some((t) => t.stage === 'cascade' && t.packageLevel === lvl)
      ) ?? null
    );
  })();
  const upaBadge = getUpaBadgeInfo(isMineUnit && !hasCascadeTasks, cascadeLevel);

  return { isMineUnit, hasCascadeTasks, isInProgress, upaBadge };
}

/** Opciones de técnico ejecutor: usuarios activos con rol de técnico especialista
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function useTechnicianOptions(users: UserIndustrial[]): SelectOption[] {
  return (users || [])
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
}

interface SubmitParams {
  selectedUnit: string;
  serviceDate: string;
  odometerAtService: number;
  cost: number;
  technician: string;
  details: RegistrationDetail[];
  isInProgress: boolean;
  fuelLevelEnd: number;
  fuelLitersLoaded: string;
  fuelAmount: string;
  endOdometer: number;
}

function buildSchedulePayload(p: SubmitParams): MaintenanceSchedulePayload {
  return {
    unitId: p.selectedUnit,
    serviceDate: p.serviceDate,
    odometerAtService: Number(p.odometerAtService),
    cost: Number(p.cost),
    technician: p.technician,
    details: p.details.map((d) => ({
      taskCode: d.taskCode,
      status: d.status,
      notes: d.notes || undefined,
    })),
    is_in_progress: p.isInProgress,
    ...(p.isInProgress
      ? {}
      : {
          fuelLevelEnd: p.fuelLevelEnd,
          fuelLitersLoaded: p.fuelLitersLoaded ? Number(p.fuelLitersLoaded) : undefined,
          fuelAmount: p.fuelAmount ? Number(p.fuelAmount) : undefined,
          endOdometer: p.endOdometer > p.odometerAtService ? p.endOdometer : undefined,
        }),
  };
}

interface SubmitState {
  submitting: boolean;
  canSubmit: boolean;
  handleSubmit: (e: FormEvent) => Promise<void>;
}

/** Envío del registro de servicio de mantenimiento
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function useSubmitRegistration(params: SubmitParams, onSuccess: () => void): SubmitState {
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = Boolean(
    params.selectedUnit && params.technician && params.odometerAtService > 0
  );

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/maintenance', buildSchedulePayload(params));
      if (res.data.success) onSuccess();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, canSubmit, handleSubmit };
}

export interface RegistrationState
  extends RegistrationFields,
    UpaPreviewState,
    MaintenanceDerived,
    SubmitState {
  units: FleetUnit[];
  selectedUnit: string;
  setSelectedUnit: (id: string) => void;
  unit: FleetUnit | undefined;
  unitOptions: SelectOption[];
  technicianOptions: SelectOption[];
  upaStatusOptions: SelectOption[];
  openPreviewStages: Record<string, boolean>;
  setOpenPreviewStages: (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void;
}

const buildUnitOptions = (units: FleetUnit[]): SelectOption[] =>
  units.map((u) => ({
    value: u.id,
    label: `${u.id} - ${u.marca || ''} ${u.modelo || ''}`.trim(),
    secondaryLabel: `ODO: ${Number(u.odometer || 0).toLocaleString()} KM | ${
      u.placas || 'Sin placas'
    }`,
    searchTerms: `${u.marca || ''} ${u.modelo || ''} ${u.placas || ''} ${u.departamento || ''}`,
  }));

const UPA_STATUS_OPTIONS: SelectOption[] = [
  { value: 'PASS', label: 'Tarea Aprobada' },
  { value: 'N_A', label: 'No Aplica' },
  { value: 'DEFERRED', label: 'Diferido Próxima Orden' },
];

/** Estado (abierto/cerrado) de cada acordeón de etapa UPA
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function usePreviewStageToggles(): {
  openPreviewStages: Record<string, boolean>;
  setOpenPreviewStages: (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void;
} {
  const [openPreviewStages, setOpenPreviewStages] = useState<Record<string, boolean>>({
    triage: true,
    minor_service: false,
    cascade: false,
    deferred: false,
    closure: false,
  });
  return { openPreviewStages, setOpenPreviewStages };
}

function buildSubmitParams(
  selectedUnit: string,
  fields: RegistrationFields,
  upaState: UpaPreviewState,
  derived: MaintenanceDerived
): SubmitParams {
  return {
    selectedUnit,
    serviceDate: fields.serviceDate,
    odometerAtService: fields.odometerAtService,
    cost: fields.cost,
    technician: fields.technician,
    details: upaState.details,
    isInProgress: derived.isInProgress,
    fuelLevelEnd: fields.fuelLevelEnd,
    fuelLitersLoaded: fields.fuelLitersLoaded,
    fuelAmount: fields.fuelAmount,
    endOdometer: fields.endOdometer,
  };
}

/** Compone unidades + campos + preview UPA + derivados + envío del registro
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
export function useRegistrationState(
  initialUnitId: string | undefined,
  users: UserIndustrial[],
  mineUnitIntervalKm: number,
  agencyDefaultIntervalKm: number,
  onSuccess: () => void
): RegistrationState {
  const units = useUnitsCatalog();
  const [selectedUnit, setSelectedUnit] = useState<string>(initialUnitId ?? '');
  const { openPreviewStages, setOpenPreviewStages } = usePreviewStageToggles();
  const unit = units.find((u) => u.id === selectedUnit);

  const fields = useRegistrationFields(selectedUnit, unit, units);
  const upaState = useUpaPreviewState(selectedUnit);
  const derived = useMaintenanceDerived(
    unit,
    upaState.upaPreview,
    mineUnitIntervalKm,
    agencyDefaultIntervalKm
  );
  const technicianOptions = useTechnicianOptions(users);
  const submitState = useSubmitRegistration(
    buildSubmitParams(selectedUnit, fields, upaState, derived),
    onSuccess
  );

  return {
    units,
    selectedUnit,
    setSelectedUnit,
    unit,
    unitOptions: buildUnitOptions(units),
    technicianOptions,
    upaStatusOptions: UPA_STATUS_OPTIONS,
    openPreviewStages,
    setOpenPreviewStages,
    ...fields,
    ...upaState,
    ...derived,
    ...submitState,
  };
}

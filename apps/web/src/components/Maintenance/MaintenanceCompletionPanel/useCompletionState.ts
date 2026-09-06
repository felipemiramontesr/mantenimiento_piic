import { useState, useEffect, FormEvent } from 'react';
import {
  MaintenanceLog,
  MaintenanceCompletionPayload,
  MaintenanceTemplateTask,
} from '../../../types/maintenance';
import api from '../../../api/client';
import { SelectOption } from '../../ArchonSelect';
import { UserIndustrial } from '../../../types/user';

interface CompletionFormFields {
  odometerAtService: number;
  setOdometerAtService: (n: number) => void;
  endOdometer: number;
  setEndOdometer: (n: number) => void;
  cost: number;
  setCost: (n: number) => void;
  technician: string;
  setTechnician: (s: string) => void;
  serviceDate: string;
  setServiceDate: (s: string) => void;
  fuelLevelEnd: number;
  setFuelLevelEnd: (n: number) => void;
  fuelLitersLoaded: string;
  setFuelLitersLoaded: (s: string) => void;
  fuelAmount: string;
  setFuelAmount: (s: string) => void;
}

/** Campos de formulario simples del cierre (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function useCompletionFormFields(log: MaintenanceLog): CompletionFormFields {
  const [odometerAtService, setOdometerAtService] = useState<number>(
    Number(log.odometer_at_service) || 0
  );
  const [endOdometer, setEndOdometer] = useState<number>(Number(log.odometer_at_service) || 0);
  const [cost, setCost] = useState<number>(Number(log.cost) || 0);
  const [technician, setTechnician] = useState<string>(log.technician || '');
  const [serviceDate, setServiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fuelLevelEnd, setFuelLevelEnd] = useState<number>(Number(log.fuel_level_start ?? 50));
  const [fuelLitersLoaded, setFuelLitersLoaded] = useState<string>('');
  const [fuelAmount, setFuelAmount] = useState<string>('');

  return {
    odometerAtService,
    setOdometerAtService,
    endOdometer,
    setEndOdometer,
    cost,
    setCost,
    technician,
    setTechnician,
    serviceDate,
    setServiceDate,
    fuelLevelEnd,
    setFuelLevelEnd,
    fuelLitersLoaded,
    setFuelLitersLoaded,
    fuelAmount,
    setFuelAmount,
  };
}

interface CompletionDetail {
  taskCode: string;
  status: string;
  notes: string;
}

interface CompletionTemplateState {
  template: MaintenanceTemplateTask[];
  details: CompletionDetail[];
  loadingTemplate: boolean;
  handleDetailChange: (index: number, field: string, value: string) => void;
}

/** Checklist de tareas del servicio: fetch de plantilla + edición
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function useCompletionTemplate(log: MaintenanceLog): CompletionTemplateState {
  const [template, setTemplate] = useState<MaintenanceTemplateTask[]>([]);
  const [details, setDetails] = useState<CompletionDetail[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState<boolean>(false);

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

  const handleDetailChange = (index: number, field: string, value: string): void => {
    const updated = [...details];
    updated[index] = { ...updated[index], [field]: value };
    setDetails(updated);
  };

  return { template, details, loadingTemplate, handleDetailChange };
}

/** Opciones de técnico ejecutor: usuarios activos con rol de técnico especialista
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
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

/** Extrae el mensaje de error de una respuesta Axios fallida, o un genérico
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function extractCompletionErrorMessage(err: unknown): string {
  const hasErrorField =
    err &&
    typeof err === 'object' &&
    'response' in err &&
    err.response &&
    typeof err.response === 'object' &&
    'data' in err.response &&
    err.response.data &&
    typeof err.response.data === 'object' &&
    'error' in err.response.data;
  return hasErrorField
    ? String((err as { response: { data: { error: unknown } } }).response.data.error)
    : 'Error al cerrar el servicio. Intente de nuevo.';
}

interface CompletionSubmitState {
  submitting: boolean;
  error: string | null;
  canSubmit: boolean;
  handleSubmit: (e: FormEvent) => Promise<void>;
}

/** Envío del cierre de servicio (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function useCompletionSubmit(
  log: MaintenanceLog,
  fields: CompletionFormFields,
  details: CompletionDetail[],
  onSuccess: () => void
): CompletionSubmitState {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = fields.odometerAtService > 0;

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: MaintenanceCompletionPayload = {
        odometerAtService: Number(fields.odometerAtService),
        cost: Number(fields.cost),
        serviceDate: fields.serviceDate,
        technician: fields.technician || undefined,
        details: details.map((d) => ({
          taskCode: d.taskCode,
          status: d.status,
          notes: d.notes || undefined,
        })),
        fuelLevelEnd: fields.fuelLevelEnd,
        fuelLitersLoaded: fields.fuelLitersLoaded ? Number(fields.fuelLitersLoaded) : undefined,
        fuelAmount: fields.fuelAmount ? Number(fields.fuelAmount) : undefined,
        endOdometer: fields.endOdometer > fields.odometerAtService ? fields.endOdometer : undefined,
      };
      const res = await api.patch(`/maintenance/${log.uuid}/complete`, payload);
      if (res.data.success) onSuccess();
    } catch (err: unknown) {
      setError(extractCompletionErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, error, canSubmit, handleSubmit };
}

export interface CompletionState
  extends CompletionFormFields,
    CompletionTemplateState,
    CompletionSubmitState {
  technicianOptions: SelectOption[];
}

/** Compone campos + checklist + técnicos + envío del cierre de servicio
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceCompletionPanel). */
export function useCompletionState(
  log: MaintenanceLog,
  users: UserIndustrial[],
  onSuccess: () => void
): CompletionState {
  const fields = useCompletionFormFields(log);
  const templateState = useCompletionTemplate(log);
  const technicianOptions = useTechnicianOptions(users);
  const submitState = useCompletionSubmit(log, fields, templateState.details, onSuccess);

  return { ...fields, ...templateState, technicianOptions, ...submitState };
}

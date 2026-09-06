import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { archonCache } from '../../../utils/archonCache';
import api from '../../../api/client';
import { RouteLog } from '../RouteLogTable';
import { CatalogOption, FleetUnit } from '../../../types/fleet';
import { FinishRoutePayload, StartRoutePayload } from '../../../types/route';
import { UserIndustrial } from '../../../types/user';
import { RouteAssignmentFormData } from './types';
import { SelectOption } from '../../ArchonSelect';
import { buildEmptyFormData, parseAddress, runTelemetryValidation } from './routeValidation';
import {
  confirmAuditRequest,
  submitRouteChanges,
  AuditRequestHandlers,
  SubmitHandlers,
} from './routeAssignmentActions';

/**
 * Sub-hooks de `useRouteAssignmentControl` — cada uno posee un segmento
 * autocontenido de estado/efecto del orquestador original (extraídos para
 * satisfacer Gate 2 `max-lines-per-function<=50`, FC165 F3 Slice3.2 Batch1,
 * Dual-Gate Isolation). Ningún guard ni rama de negocio fue alterado: es
 * exactamente la misma lógica, reubicada.
 */

/** Orígenes de catálogo (`ROUTE_ORIGIN`, cacheados) + rutas activas — usados
 * para hidratar opciones y detectar operadores/unidades ya ocupados. */
export function useRouteCatalogData(routeToEdit: RouteLog | null | undefined): {
  origins: CatalogOption[];
  activeRoutes: RouteLog[];
} {
  const [origins, setOrigins] = useState<CatalogOption[]>(
    () => archonCache.get<CatalogOption[]>('route_origins') || []
  );
  const [activeRoutes, setActiveRoutes] = useState<RouteLog[]>([]);

  const fetchActiveRoutes = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get('/routes');
      const active = (res.data?.data || []).filter((r: RouteLog) => !r.end_time);
      setActiveRoutes(active);
    } catch {
      /* Silent fail */
    }
  }, []);

  useEffect((): void => {
    const fetchOrigins = async (): Promise<void> => {
      try {
        const res = await api.get('/catalogs/ROUTE_ORIGIN');
        const data = res.data?.data || res.data || [];
        setOrigins(data);
        archonCache.set('route_origins', data);
      } catch {
        if (origins.length === 0) setOrigins([{ id: 1, label: 'Arian Silver Zacatecas' }]);
      }
    };

    fetchOrigins();
    fetchActiveRoutes();
  }, [fetchActiveRoutes, routeToEdit]); // Re-fetch availability when context changes

  return { origins, activeRoutes };
}

/** Construye el `formData` completo a partir de una ruta existente —
 * extraído de `hydrateRouteData` para que `useRouteHydration` respete Gate 2
 * (FC165 F3 Slice3.2 Batch1, Dual-Gate Isolation). */
function buildHydratedFormData(route: RouteLog, origins: CatalogOption[]): RouteAssignmentFormData {
  const startFuel = Number(route.fuel_level_start ?? 100);
  const arrivalFuel = Number(route.fuel_level_end ?? route.fuel_level_start ?? 100);
  const liters = Number(route.fuel_liters_loaded || 0);
  const { calle, numero, numeroInterior } = parseAddress(route.destination || '');

  return {
    unitId: route.unit_id || '',
    operatorId: String(route.operator_id || ''),
    origin:
      origins.find((o) => o.id === route.origin_id)?.label ||
      route.origin ||
      'Arian Silver Zacatecas',
    destination: route.destination || '',
    destinationNeighborhoodId: route.destination_neighborhood_id
      ? Number(route.destination_neighborhood_id)
      : undefined,
    description: route.description || '',
    fuelLevel: startFuel,
    arrivalFuelLevel: arrivalFuel,
    startReading: Number(route.start_km ?? 0),
    endReading: Number(route.end_km ?? 0),
    fuelLitersLoaded: liters,
    fuelAmount: Number(route.fuel_amount || 0),
    fuelTicketImage: route.fuel_ticket_image || '',
    additivesCheck: Boolean(route.additives_check),
    tirePressureJson: route.tire_pressure_json || '',
    checklistJson: route.checklist_json || '',
    calle,
    numero,
    numeroInterior,
  };
}

/** 🧪 Initialization & Hydration (Refactored v.78.99.5): hidrata `formData`
 * desde `routeToEdit` cuando hay unidades cargadas, o restaura un formulario
 * en blanco al pasar a modo "nuevo despacho". */
export function useRouteHydration(
  routeToEdit: RouteLog | null | undefined,
  units: FleetUnit[],
  origins: CatalogOption[],
  setFormData: Dispatch<SetStateAction<RouteAssignmentFormData>>
): void {
  const hydrateRouteData = useCallback(
    (route: RouteLog) => setFormData(buildHydratedFormData(route, origins)),
    [units, origins, setFormData]
  );

  useEffect((): void => {
    if (routeToEdit && units.length > 0) {
      hydrateRouteData(routeToEdit);
    } else if (!routeToEdit) {
      // 🔱 Atomic Reset: Ensure a clean slate for new assignments
      setFormData(buildEmptyFormData());
    }
  }, [routeToEdit, units, hydrateRouteData, setFormData]);
}

/** 🏎️ Selection Sync (Inheritance Protocol v.75.0.0): al elegir/cambiar de
 * unidad, hereda su telemetría (odómetro/combustible) en `formData`. */
export function useUnitSelectionSync(
  formData: RouteAssignmentFormData,
  units: FleetUnit[],
  isEdit: boolean,
  setSelectedUnitData: Dispatch<SetStateAction<FleetUnit | null>>,
  setFormData: Dispatch<SetStateAction<RouteAssignmentFormData>>
): void {
  useEffect((): void => {
    if (formData.unitId) {
      const unit = units.find((u) => u.id === formData.unitId);
      setSelectedUnitData(unit || null);

      if (!isEdit && unit) {
        // Inherit telemetry from unit's last known state
        setFormData((prev) => ({
          ...prev,
          startReading: Number(unit.odometer || 0),
          fuelLevel: Number(unit.lastFuelLevel ?? 100),
          arrivalFuelLevel: Number(unit.lastFuelLevel ?? 100),
        }));
      }

      // 🔱 Initial Telemetry Capture: Only hydrate if current reading is explicitly empty or zero
      if (isEdit && unit && (formData.endReading === undefined || formData.endReading === 0)) {
        setFormData((prev) => ({ ...prev, endReading: Number(unit.odometer || 0) }));
      }
    } else {
      setSelectedUnitData(null);
    }
  }, [formData.unitId, units, isEdit]);
}

/** 📐 Sorting & Filtering (Memoized for Performance): unidades disponibles y
 * operadores libres, listos como `SelectOption[]` para los combos. */
export function useRouteOptions(
  units: FleetUnit[],
  isEdit: boolean,
  routeToEdit: RouteLog | null | undefined,
  users: UserIndustrial[],
  activeRoutes: RouteLog[]
): { availableUnits: SelectOption[]; operatorOptions: SelectOption[] } {
  const availableUnits = useMemo(
    (): SelectOption[] =>
      units
        .filter((u) => u.status === 'Disponible' || (isEdit && u.id === routeToEdit?.unit_id))
        .sort((a, b) => (a.id > b.id ? 1 : -1))
        .map((u) => ({
          value: u.id,
          label: `${u.id} - ${u.marca} ${u.modelo}`,
          secondaryLabel: `ODO: ${Number(u.odometer || 0).toLocaleString()} KM | ${u.placas}`,
          searchTerms: `${u.marca} ${u.modelo} ${u.placas} ${u.departamento}`,
        })),
    [units, isEdit, routeToEdit]
  );

  const operatorOptions = useMemo((): SelectOption[] => {
    const busyUserIds = new Set(activeRoutes.map((r) => r.operator_id));
    return users
      .filter((u) => !busyUserIds.has(u.id) || (isEdit && u.id === routeToEdit?.operator_id))
      .sort((a, b) => (a.fullName > b.fullName ? 1 : -1))
      .map((u) => ({
        value: String(u.id),
        label: u.fullName,
        secondaryLabel: `${u.roleName?.toUpperCase() || 'USUARIO'} | NÓMINA: ${
          u.employeeNumber || 'S/N'
        }`,
        searchTerms: `${u.employeeNumber || ''} ${u.roleName || ''} ${u.email || ''}`,
      }));
  }, [users, activeRoutes, isEdit, routeToEdit]);

  return { availableUnits, operatorOptions };
}

export interface SubmissionState {
  submitting: boolean;
  error: string | null;
  isAuditModalOpen: boolean;
  setIsAuditModalOpen: (open: boolean) => void;
  auditAction: 'UPDATE' | 'DELETE';
  handleConfirmAudit: (reason: string) => Promise<void>;
  handleSubmit: (e: FormEvent) => Promise<void>;
  triggerAuditDelete: () => void;
}

export interface RouteAssignmentSubmissionParams {
  formData: RouteAssignmentFormData;
  selectedUnitData: FleetUnit | null;
  origins: CatalogOption[];
  isEdit: boolean;
  isFinished: boolean;
  routeToEdit: RouteLog | null | undefined;
  refreshUnits: () => Promise<void>;
  onClose: () => void;
  finishRoute: (uuid: string, payload: FinishRoutePayload) => Promise<void>;
  startRoute: (payload: StartRoutePayload) => Promise<void>;
}

interface MissionContext {
  formData: RouteAssignmentFormData;
  origins: CatalogOption[];
  isEdit: boolean;
  isFinished: boolean;
  routeToEdit: RouteLog | null | undefined;
}

interface SubmissionBaseState {
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  error: string | null;
  setError: (msg: string | null) => void;
  isAuditModalOpen: boolean;
  setIsAuditModalOpen: (v: boolean) => void;
  auditAction: 'UPDATE' | 'DELETE';
  setAuditAction: (a: 'UPDATE' | 'DELETE') => void;
}

/** Estado base compartido por auditoría/envío + el reset de `error` al salir
 * de modo edición — privado, sin JSDoc requerido (no exportado). */
function useSubmissionBaseState(routeToEdit: RouteLog | null | undefined): SubmissionBaseState {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditAction, setAuditAction] = useState<'UPDATE' | 'DELETE'>('UPDATE');

  useEffect((): void => {
    if (!routeToEdit) setError(null);
  }, [routeToEdit]);

  return {
    submitting,
    setSubmitting,
    error,
    setError,
    isAuditModalOpen,
    setIsAuditModalOpen,
    auditAction,
    setAuditAction,
  };
}

function useTelemetryValidation(
  ctx: MissionContext,
  selectedUnitData: FleetUnit | null,
  setError: (msg: string | null) => void
): () => boolean {
  const { formData, isEdit, isFinished, routeToEdit } = ctx;
  return useCallback((): boolean => {
    const err = runTelemetryValidation(
      formData,
      selectedUnitData,
      isEdit,
      isFinished,
      routeToEdit || null
    );
    if (err) setError(err);
    return !err;
  }, [formData, selectedUnitData, isEdit, isFinished, routeToEdit, setError]);
}

function useConfirmAuditHandler(
  ctx: MissionContext,
  state: SubmissionBaseState,
  validateTelemetry: () => boolean,
  refreshUnits: () => Promise<void>,
  onClose: () => void
): (reason: string) => Promise<void> {
  const { formData, origins, isFinished, routeToEdit } = ctx;
  const { auditAction, setError, setSubmitting, setIsAuditModalOpen } = state;

  const handlers: AuditRequestHandlers = useMemo(
    () => ({
      validateTelemetry,
      refreshUnits,
      onClose,
      setError,
      setSubmitting,
      setIsAuditModalOpen,
    }),
    [validateTelemetry, refreshUnits, onClose, setError, setSubmitting, setIsAuditModalOpen]
  );

  return useCallback(
    async (reason: string): Promise<void> => {
      await confirmAuditRequest(
        { reason, auditAction, formData, origins, isFinished, routeToEdit },
        handlers
      );
    },
    [auditAction, formData, origins, isFinished, routeToEdit, handlers]
  );
}

function useSubmitHandler(
  ctx: MissionContext,
  state: SubmissionBaseState,
  validateTelemetry: () => boolean,
  refreshUnits: () => Promise<void>,
  onClose: () => void,
  finishRoute: (uuid: string, payload: FinishRoutePayload) => Promise<void>,
  startRoute: (payload: StartRoutePayload) => Promise<void>
): (e: FormEvent) => Promise<void> {
  const { formData, origins, isEdit, isFinished, routeToEdit } = ctx;
  const { setAuditAction, setIsAuditModalOpen, setSubmitting, setError } = state;

  const handlers: SubmitHandlers = useMemo(
    () => ({
      validateTelemetry,
      setAuditAction,
      setIsAuditModalOpen,
      setSubmitting,
      setError,
      finishRoute,
      refreshUnits,
      startRoute,
      onClose,
    }),
    [
      validateTelemetry,
      setAuditAction,
      setIsAuditModalOpen,
      setSubmitting,
      setError,
      finishRoute,
      refreshUnits,
      startRoute,
      onClose,
    ]
  );

  return useCallback(
    async (e: FormEvent): Promise<void> => {
      e.preventDefault();
      await submitRouteChanges(
        { formData, isFinished, isEdit, routeToEdit: routeToEdit || null, origins },
        handlers
      );
    },
    [formData, isFinished, isEdit, routeToEdit, origins, handlers]
  );
}

function useAuditDeleteTrigger(state: SubmissionBaseState): () => void {
  const { setAuditAction, setIsAuditModalOpen } = state;
  return useCallback((): void => {
    setAuditAction('DELETE');
    setIsAuditModalOpen(true);
  }, [setAuditAction, setIsAuditModalOpen]);
}

/** Posee todo el estado/lógica de envío y auditoría forense: `submitting`,
 * `error`, el modal de auditoría y sus dos handlers (`handleConfirmAudit`,
 * `handleSubmit`) — cuerpos reales en `routeAssignmentActions.ts`
 * (`confirmAuditRequest`/`submitRouteChanges`), este hook solo los conecta
 * al estado de React (FC165 F3 Slice3.2 Batch1, Dual-Gate Isolation). */
export function useRouteAssignmentSubmission(
  params: RouteAssignmentSubmissionParams
): SubmissionState {
  const {
    formData,
    selectedUnitData,
    origins,
    isEdit,
    isFinished,
    routeToEdit,
    refreshUnits,
    onClose,
    finishRoute,
    startRoute,
  } = params;

  const ctx: MissionContext = useMemo(
    () => ({ formData, origins, isEdit, isFinished, routeToEdit }),
    [formData, origins, isEdit, isFinished, routeToEdit]
  );

  const state = useSubmissionBaseState(routeToEdit);
  const validateTelemetry = useTelemetryValidation(ctx, selectedUnitData, state.setError);
  const handleConfirmAudit = useConfirmAuditHandler(
    ctx,
    state,
    validateTelemetry,
    refreshUnits,
    onClose
  );
  const handleSubmit = useSubmitHandler(
    ctx,
    state,
    validateTelemetry,
    refreshUnits,
    onClose,
    finishRoute,
    startRoute
  );

  const triggerAuditDelete = useAuditDeleteTrigger(state);

  return {
    submitting: state.submitting,
    error: state.error,
    isAuditModalOpen: state.isAuditModalOpen,
    setIsAuditModalOpen: state.setIsAuditModalOpen,
    auditAction: state.auditAction,
    handleConfirmAudit,
    handleSubmit,
    triggerAuditDelete,
  };
}

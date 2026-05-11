import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AxiosError } from 'axios';
import { useFleet } from '../../../context/FleetContext';
import { useUsers } from '../../../context/UserContext';
import { archonCache } from '../../../utils/archonCache';
import api from '../../../api/client';
import { RouteLog } from '../RouteLogTable';
import { CatalogOption, FleetUnit } from '../../../types/fleet';
import { RouteAssignmentFormData } from './types';
import { SelectOption } from '../../ArchonSelect';

interface RouteAssignmentControl {
  formData: RouteAssignmentFormData;
  updateForm: (updates: Partial<RouteAssignmentFormData>) => void;
  isEdit: boolean;
  isFinished: boolean;
  origins: CatalogOption[];
  availableUnits: SelectOption[];
  operatorOptions: SelectOption[];
  selectedUnitData: FleetUnit | null;
  submitting: boolean;
  error: string | null;
  isAuditModalOpen: boolean;
  setIsAuditModalOpen: (open: boolean) => void;
  auditAction: 'UPDATE' | 'DELETE';
  handleConfirmAudit: (reason: string) => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  triggerAuditDelete: () => void;
}

/**
 * 🔱 Archon Hook: useRouteAssignmentControl
 * Purpose: Centralizes the mission control logic, state management and forensics.
 * Scalability: Decouples business rules from the rendering layer.
 */
export const useRouteAssignmentControl = (
  onClose: () => void,
  routeToEdit?: RouteLog | null
): RouteAssignmentControl => {
  const { units, startRoute, finishRoute } = useFleet();
  const { users } = useUsers();

  const isEdit = !!routeToEdit;
  const isFinished = !!routeToEdit?.end_time;

  const [formData, setFormData] = useState<RouteAssignmentFormData>({
    unitId: '',
    operatorId: '',
    origin: 'Arian Silver Zacatecas',
    destination: '',
    description: '',
    fuelLevel: 100,
    arrivalFuelLevel: 100,
    startReading: 0,
    endReading: 0,
    fuelLitersLoaded: 0,
    fuelAmount: 0,
    fuelTicketImage: '',
    additivesCheck: false,
    tirePressureJson: '',
    checklistJson: '',
  });

  const [origins, setOrigins] = useState<CatalogOption[]>(
    () => archonCache.get<CatalogOption[]>('route_origins') || []
  );

  const [selectedUnitData, setSelectedUnitData] = useState<FleetUnit | null>(null);
  const [activeRoutes, setActiveRoutes] = useState<RouteLog[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditAction, setAuditAction] = useState<'UPDATE' | 'DELETE'>('UPDATE');

  // 🧪 Initialization & Hydration (Refactored v.78.99.5)
  const hydrateRouteData = useCallback(
    (route: RouteLog) => {
      const raw = route as unknown as Record<string, unknown>;
      const liters = Number(raw.fuel_liters_loaded || raw.fuelLitersLoaded || 0);
      const unitId = (raw.unit_id as string) || (raw.unitId as string) || '';
      const unit = units.find((u) => u.id === unitId);
      const capacity = unit?.fuelTankCapacity || 80;

      const hydratedTotal = Number(
        (isFinished ? raw.fuel_level_end ?? raw.fuel_level_start : raw.fuel_level_start) ??
          raw.fuelLevel ??
          100
      );

      // Back-calculate arrival base if route is finished (Total - Load)
      const loadIncrement = (liters / capacity) * 100;
      const arrivalBase = isFinished ? Math.max(0, hydratedTotal - loadIncrement) : hydratedTotal;

      setFormData({
        unitId,
        operatorId: String(raw.operator_id || raw.driver_id || ''),
        origin:
          origins.find((o) => o.id === raw.origin_id)?.label ||
          (raw.origin as string) ||
          'Arian Silver Zacatecas',
        destination: (raw.destination as string) || '',
        description: (raw.description as string) || '',
        fuelLevel: hydratedTotal,
        arrivalFuelLevel: arrivalBase,
        startReading: Number(raw.start_km || raw.start_reading || 0),
        endReading: Number(raw.end_km || raw.end_reading || 0),
        fuelLitersLoaded: liters,
        fuelAmount: Number(raw.fuel_amount || 0),
        fuelTicketImage: (raw.fuel_ticket_image as string) || '',
        additivesCheck: !!(raw.additives_check || raw.additivesCheck),
        tirePressureJson: (raw.tire_pressure_json as string) || '',
        checklistJson: (raw.checklist_json as string) || '',
      });
    },
    [units, origins, isFinished]
  );

  useEffect((): void => {
    if (routeToEdit && units.length > 0) {
      hydrateRouteData(routeToEdit);
    } else if (!routeToEdit) {
      // 🔱 Atomic Reset: Ensure a clean slate for new assignments
      setFormData({
        unitId: '',
        operatorId: '',
        origin: 'Arian Silver Zacatecas',
        destination: '',
        description: '',
        fuelLevel: 100,
        arrivalFuelLevel: 100,
        startReading: 0,
        endReading: 0,
        fuelLitersLoaded: 0,
        fuelAmount: 0,
        fuelTicketImage: '',
        additivesCheck: false,
        tirePressureJson: '',
        checklistJson: '',
      });
      setError(null);
    }
  }, [routeToEdit, units, hydrateRouteData]);

  const fetchActiveRoutes = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get('/routes');
      const active = (res.data?.data || []).filter((r: RouteLog) => !r.end_time);
      setActiveRoutes(active);
    } catch (err) {
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
      } catch (err) {
        if (origins.length === 0) setOrigins([{ id: 1, label: 'Arian Silver Zacatecas' }]);
      }
    };

    fetchOrigins();
    fetchActiveRoutes();
  }, [fetchActiveRoutes, routeToEdit]); // Re-fetch availability when context changes

  // 🏎️ Selection Sync (Inheritance Protocol v.75.0.0)
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
        }));
      }

      if (isEdit && unit && !formData.endReading) {
        setFormData((prev) => ({ ...prev, endReading: Number(unit.currentReading || 0) }));
      }
    } else {
      setSelectedUnitData(null);
    }
  }, [formData.unitId, units, isEdit]);

  // 📐 Sorting & Filtering (Memoized for Performance)

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
    const busyUserIds = activeRoutes.map((r) => r.operator_id);
    return users
      .filter((u) => !busyUserIds.includes(u.id) || (isEdit && u.id === routeToEdit?.operator_id))
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

  // 📝 Actions
  const updateForm = useCallback(
    (updates: Partial<RouteAssignmentFormData>): void => {
      setFormData((prev) => {
        const next = { ...prev, ...updates };

        // 🔱 Reactive Telemetry Linking (v.78.96.8)
        // Whenever Arrival Level or Liters Loaded change, recalculate total FuelLevel
        // 🧪 Consolidated Update Logic (Total-to-Arrival Conversion)
        if ('fuelLevel' in updates && !('arrivalFuelLevel' in updates)) {
          const total = next.fuelLevel;
          const liters = next.fuelLitersLoaded;
          const capacity = selectedUnitData?.fuelTankCapacity || 80;
          const increment = (liters / capacity) * 100;
          next.arrivalFuelLevel = Math.max(0, total - increment);
        }

        // 🧪 Arrival/Load-to-Total Conversion
        if (
          ('arrivalFuelLevel' in updates || 'fuelLitersLoaded' in updates) &&
          selectedUnitData?.fuelTankCapacity
        ) {
          const base = next.arrivalFuelLevel;
          const liters = next.fuelLitersLoaded;
          const capacity = selectedUnitData.fuelTankCapacity;
          const increment = (liters / capacity) * 100;
          next.fuelLevel = Math.min(100, base + increment);
        }

        return next;
      });
    },
    [selectedUnitData]
  );

  const getForensicPayload = (): Record<string, unknown> => {
    const originId = origins.find((o) => o.label === formData.origin)?.id;
    const { origin: _origin, ...rest } = formData;
    return {
      ...rest,
      operatorId: formData.operatorId ? Number(formData.operatorId) : undefined,
      originId: originId ? Number(originId) : undefined,
      fuelLevel: Number(formData.fuelLevel || 0),
      fuelLitersLoaded: Number(formData.fuelLitersLoaded || 0),
      fuelAmount: Number(formData.fuelAmount || 0),
      startReading: Number(formData.startReading || 0),
      endReading: Number(formData.endReading || 0),
      additivesCheck: formData.additivesCheck ? 1 : 0,
      tirePressureJson: formData.tirePressureJson || null,
      checklistJson: formData.checklistJson || null,
    };
  };

  const handleConfirmAudit = async (reason: string): Promise<void> => {
    if (!reason || reason.length < 5) {
      setError('La justificación debe tener al menos 5 caracteres.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (auditAction === 'UPDATE') {
        const payload = getForensicPayload();
        await api.put(`/routes/${routeToEdit?.uuid}`, { data: payload, reason });
      } else {
        await api.delete(`/routes/${routeToEdit?.uuid}`, { data: { reason } });
      }

      // 🔱 Atomic Success: Only close when synchronization is verified
      setSubmitting(false);
      setIsAuditModalOpen(false);
      onClose();
    } catch (err: unknown) {
      setSubmitting(false);
      const axiosError = err as AxiosError<{ message?: string }>;
      const serverMsg = axiosError.response?.data?.message;
      const msg =
        serverMsg || (err instanceof Error ? err.message : 'Error en el protocolo de auditoría');
      setError(msg);
      // DO NOT close modal, allow user to correct or retry
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isFinished) {
      setAuditAction('UPDATE');
      setIsAuditModalOpen(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    // 🛡️ Forensic Failsafe: Prevent logical telemetry errors
    if (isEdit && routeToEdit) {
      const end = Number(formData.endReading);
      const start = Number(formData.startReading);
      if (end < start) {
        setError(
          `Error Forense: La lectura final (${end}) no puede ser menor a la inicial (${start}).`
        );
        setSubmitting(false);
        return;
      }
    }

    try {
      if (isEdit && routeToEdit) {
        if (Number(formData.endReading) > 0) {
          // 🏁 Finish Mission: End kilometer provided
          await finishRoute(routeToEdit.uuid, {
            endReading: Number(formData.endReading),
            fuelLevelEnd: Number(formData.fuelLevel),
            fuelLitersLoaded: Number(formData.fuelLitersLoaded),
            fuelAmount: Number(formData.fuelAmount),
            fuelTicketImage: formData.fuelTicketImage || undefined,
            additivesCheck: formData.additivesCheck,
            tirePressureJson: formData.tirePressureJson || undefined,
            checklistJson: formData.checklistJson || undefined,
          });
        } else {
          // 📝 Correct Active Mission: Typos, operator change, etc.
          await api.put(`/routes/${routeToEdit.uuid}`, { data: formData });
        }
      } else {
        // 🚀 New Dispatch
        await startRoute({
          unitId: formData.unitId,
          driverId: Number(formData.operatorId),
          startReading: Number(formData.startReading),
          fuelLevelStart: Number(formData.fuelLevel),
          destination: formData.destination,
          originId: origins.find((o) => o.label === formData.origin)?.id
            ? Number(origins.find((o) => o.label === formData.origin)?.id)
            : undefined,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en la operación';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const triggerAuditDelete = (): void => {
    setAuditAction('DELETE');
    setIsAuditModalOpen(true);
  };

  return {
    formData,
    updateForm,
    isEdit,
    isFinished,
    origins,
    availableUnits,
    operatorOptions,
    selectedUnitData,
    submitting,
    error,
    isAuditModalOpen,
    setIsAuditModalOpen,
    auditAction,
    handleConfirmAudit,
    handleSubmit,
    triggerAuditDelete,
  };
};

export default useRouteAssignmentControl;

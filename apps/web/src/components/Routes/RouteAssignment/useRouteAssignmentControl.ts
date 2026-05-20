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

interface ParsedAddress {
  calle: string;
  numero: string;
  numeroInterior: string;
}

export const parseAddress = (destinationStr: string): ParsedAddress => {
  const parts = destinationStr.split(',').map((p) => p.trim());
  let parsedCalle = '';
  let parsedNumero = '';
  let parsedNumeroInterior = '';

  if (parts.length >= 4) {
    const streetPart = parts[0];
    const intMatch = streetPart.match(/[\s,]+(?:Int\.?|int\.?|INT\.?)\s*([^\s]+.*)$/i);
    let mainStreet = streetPart;
    if (intMatch) {
      parsedNumeroInterior = intMatch[1].trim();
      mainStreet = streetPart.substring(0, intMatch.index).trim();
    }

    const numMatch = mainStreet.match(/[\s,]+#(No\.?|N°|N\.?)?\s*([^\s]+)$/i);
    if (numMatch) {
      parsedNumero = numMatch[2].trim();
      parsedCalle = mainStreet.substring(0, numMatch.index).trim();
    } else {
      const numEndMatch = mainStreet.match(/[\s,]+([0-9]+[a-zA-Z]?)$/);
      if (numEndMatch) {
        parsedNumero = numEndMatch[1].trim();
        parsedCalle = mainStreet.substring(0, numEndMatch.index).trim();
      } else {
        parsedCalle = mainStreet;
      }
    }
  }

  return { calle: parsedCalle, numero: parsedNumero, numeroInterior: parsedNumeroInterior };
};

export const getFinalDestination = (formData: RouteAssignmentFormData): string => {
  let finalDest = formData.destination;
  const calle = formData.calle?.trim();
  const numero = formData.numero?.trim();
  const numeroInterior = formData.numeroInterior?.trim();

  if (calle) {
    let streetDetails = calle;
    if (numero) {
      streetDetails += ` #${numero}`;
    }
    if (numeroInterior) {
      streetDetails += ` Int. ${numeroInterior}`;
    }
    const destParts = formData.destination.split(',').map((p) => p.trim());
    let suffix = formData.destination;
    if (destParts.length >= 4) {
      suffix = destParts.slice(1).join(', ');
    } else if (destParts.length === 3) {
      suffix = destParts.join(', ');
    }
    finalDest = `${streetDetails}, ${suffix}`;
  }
  return finalDest;
};

/**
 * 🔱 Archon Hook: useRouteAssignmentControl
 * Purpose: Centralizes the mission control logic, state management and forensics.
 * Scalability: Decouples business rules from the rendering layer.
 */
export const useRouteAssignmentControl = (
  onClose: () => void,
  routeToEdit?: RouteLog | null
): RouteAssignmentControl => {
  const { units, startRoute, finishRoute, refreshUnits } = useFleet();
  const { users } = useUsers();

  const isEdit = !!routeToEdit;
  const isFinished = !!routeToEdit?.end_time;

  const [formData, setFormData] = useState<RouteAssignmentFormData>({
    unitId: '',
    operatorId: '',
    origin: 'Arian Silver Zacatecas',
    destination: '',
    destinationColoniaId: undefined,
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
    calle: '',
    numero: '',
    numeroInterior: '',
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
      const unitId = route.unit_id || '';
      const unit = units.find((u) => u.id === unitId);
      const capacity = unit?.fuelTankCapacity || 80;

      // Determinamos el nivel de combustible a mostrar basado en el estatus
      const fuelVal = isFinished
        ? Number(route.fuel_level_end ?? route.fuel_level_start ?? 100)
        : Number(route.fuel_level_start ?? 100);

      const liters = Number(route.fuel_liters_loaded || 0);
      const loadIncrement = (liters / capacity) * 100;
      const arrivalBase = isFinished ? Math.max(0, fuelVal - loadIncrement) : fuelVal;

      const destinationStr = route.destination || '';
      const {
        calle: parsedCalle,
        numero: parsedNumero,
        numeroInterior: parsedNumeroInterior,
      } = parseAddress(destinationStr);

      setFormData({
        unitId,
        operatorId: String(route.operator_id || ''),
        origin:
          origins.find((o) => o.id === route.origin_id)?.label ||
          route.origin ||
          'Arian Silver Zacatecas',
        destination: route.destination || '',
        destinationColoniaId: route.destination_colonia_id
          ? Number(route.destination_colonia_id)
          : undefined,
        description: route.description || '',
        fuelLevel: fuelVal,
        arrivalFuelLevel: arrivalBase,
        startReading: Number(route.start_km ?? 0),
        endReading: Number(route.end_km ?? 0),
        fuelLitersLoaded: liters,
        fuelAmount: Number(route.fuel_amount || 0),
        fuelTicketImage: route.fuel_ticket_image || '',
        additivesCheck: Boolean(route.additives_check),
        tirePressureJson: route.tire_pressure_json || '',
        checklistJson: route.checklist_json || '',
        calle: parsedCalle,
        numero: parsedNumero,
        numeroInterior: parsedNumeroInterior,
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
        destinationColoniaId: undefined,
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
        calle: '',
        numero: '',
        numeroInterior: '',
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

      // 🔱 Initial Telemetry Capture: Only hydrate if current reading is explicitly empty or zero
      if (isEdit && unit && (formData.endReading === undefined || formData.endReading === 0)) {
        setFormData((prev) => ({ ...prev, endReading: Number(unit.odometer || 0) }));
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
          const total = Number(next.fuelLevel || 0);
          const liters = Number(next.fuelLitersLoaded || 0);
          const capacity = selectedUnitData?.fuelTankCapacity || 80;
          const increment = (liters / capacity) * 100;
          next.arrivalFuelLevel = Math.max(0, total - increment);
        }

        // 🧪 Arrival/Load-to-Total Conversion
        if (
          ('arrivalFuelLevel' in updates || 'fuelLitersLoaded' in updates) &&
          selectedUnitData?.fuelTankCapacity
        ) {
          const base = Number(next.arrivalFuelLevel || 0);
          const liters = Number(next.fuelLitersLoaded || 0);
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
    const {
      origin: _origin,
      calle: _calle,
      numero: _numero,
      numeroInterior: _numeroInterior,
      ...rest
    } = formData;

    const finalDest = getFinalDestination(formData);

    return {
      ...rest,
      destination: finalDest,
      operatorId: formData.operatorId ? Number(formData.operatorId) : undefined,
      originId: originId ? Number(originId) : undefined,
      destinationColoniaId: formData.destinationColoniaId
        ? Number(formData.destinationColoniaId)
        : null,
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

      // 🔱 Global Synchronization: Ensure Fleet Inventory reflects forensic changes
      await refreshUnits();

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

  const triggerAuditDelete = (): void => {
    setAuditAction('DELETE');
    setIsAuditModalOpen(true);
  };

  const validateTelemetry = useCallback((): boolean => {
    // 🛡️ Forensic Failsafe: Prevent logical telemetry errors
    if (isEdit && routeToEdit) {
      const end = Number(formData.endReading);
      const start = Number(formData.startReading);
      if (end < start) {
        setError(
          `Error Forense: La lectura final (${end}) no puede ser menor a la inicial (${start}).`
        );
        return false;
      }
    } else if (!isEdit && selectedUnitData) {
      const start = Number(formData.startReading);
      const unitOdo = Number(selectedUnitData.odometer);
      if (start < unitOdo) {
        setError(
          `Error Forense: El inicio de ruta (${start}) no puede ser menor al odómetro actual de la unidad (${unitOdo}).`
        );
        return false;
      }
    }
    return true;
  }, [isEdit, routeToEdit, formData.endReading, formData.startReading, selectedUnitData]);

  const handleFinishMission = async (): Promise<void> => {
    if (!routeToEdit) return;
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
  };

  const handleCorrectActiveMission = async (finalDest: string): Promise<void> => {
    if (!routeToEdit) return;
    const { origin: _origin, calle: _c, numero: _n, numeroInterior: _ni, ...rest } = formData;
    await api.put(`/routes/${routeToEdit.uuid}`, {
      data: {
        ...rest,
        destination: finalDest,
        destinationColoniaId: formData.destinationColoniaId
          ? Number(formData.destinationColoniaId)
          : null,
        operatorId: formData.operatorId ? Number(formData.operatorId) : undefined,
        originId: origins.find((o) => o.label === formData.origin)?.id
          ? Number(origins.find((o) => o.label === formData.origin)?.id)
          : undefined,
      },
    });
    await refreshUnits();
  };

  const handleNewDispatch = async (finalDest: string): Promise<void> => {
    await startRoute({
      unitId: formData.unitId,
      driverId: Number(formData.operatorId),
      startReading: Number(formData.startReading),
      fuelLevelStart: Number(formData.fuelLevel),
      destination: finalDest,
      destinationColoniaId: formData.destinationColoniaId
        ? Number(formData.destinationColoniaId)
        : undefined,
      originId: origins.find((o) => o.label === formData.origin)?.id
        ? Number(origins.find((o) => o.label === formData.origin)?.id)
        : undefined,
    });
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

    if (!validateTelemetry()) {
      setSubmitting(false);
      return;
    }

    try {
      const finalDest = getFinalDestination(formData);

      if (isEdit && routeToEdit) {
        if (Number(formData.endReading) > 0) {
          await handleFinishMission();
        } else {
          await handleCorrectActiveMission(finalDest);
        }
      } else {
        await handleNewDispatch(finalDest);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en la operación';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
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

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

export const roundToTwo = (val: number | string | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  const num = Number(val);
  return Number.isNaN(num) ? 0 : Math.round(num * 100) / 100;
};

export const validateReadingFailsafe = (
  formData: RouteAssignmentFormData,
  selectedUnitData: FleetUnit | null,
  isEdit: boolean,
  routeToEdit: RouteLog | null
): string | null => {
  const end = Number(formData.endReading || 0);
  const start = Number(formData.startReading || 0);

  if (isEdit && routeToEdit) {
    if (end > 0 && end < start) {
      return `Error Forense: La lectura final (${end} KM) no puede ser menor a la inicial (${start} KM).`;
    }
  } else if (!isEdit && selectedUnitData) {
    const unitOdo = Number(selectedUnitData.odometer || 0);
    if (start < unitOdo) {
      return `Error Forense: El inicio de ruta (${start} KM) no puede ser menor al odómetro actual de la unidad (${unitOdo} KM).`;
    }
  }
  return null;
};

export const validateDistance = (formData: RouteAssignmentFormData): string | null => {
  const end = Number(formData.endReading || 0);
  const start = Number(formData.startReading || 0);

  if (end === 0) {
    return 'Error Forense: Debe ingresar la lectura de odómetro final para cerrar la ruta.';
  }
  if (end === start) {
    return 'Error Forense: La lectura final no puede ser igual a la lectura inicial (el viaje debe registrar movimiento).';
  }
  const distance = end - start;
  if (distance > 5000) {
    return `Error Forense: La distancia recorrida no puede superar los 5,000 km en una sola misión (${distance.toLocaleString()} km detectados).`;
  }
  return null;
};

export const validateFuelLevel = (formData: RouteAssignmentFormData): string | null => {
  const arrivalFuel = Number(formData.arrivalFuelLevel);
  if (Number.isNaN(arrivalFuel) || arrivalFuel < 0 || arrivalFuel > 100) {
    return `Error Forense: El nivel de combustible de llegada debe estar exactamente entre 0% y 100% (${arrivalFuel}% detectado).`;
  }
  return null;
};

export const validateFuelCoherency = (
  formData: RouteAssignmentFormData,
  selectedUnitData: FleetUnit | null
): string | null => {
  const liters = Number(formData.fuelLitersLoaded || 0);
  const amount = Number(formData.fuelAmount || 0);

  if (liters < 0) {
    return 'Error Forense: Los litros de combustible cargados no pueden ser negativos.';
  }
  if (amount < 0) {
    return 'Error Forense: El costo total del combustible no puede ser negativo.';
  }

  if (liters > 0 && amount <= 0) {
    return 'Error Forense: Coherencia de Combustible - Si se cargaron litros de combustible, el costo total (Monto del Ticket) debe ser mayor a cero.';
  }
  if (amount > 0 && liters <= 0) {
    return 'Error Forense: Coherencia de Combustible - Si se registró un costo de combustible, los litros cargados deben ser mayores a cero.';
  }

  const unitCapacity = selectedUnitData?.fuelTankCapacity || 0;
  const maxAllowedLiters = unitCapacity > 0 ? unitCapacity * 1.2 : 400;
  if (liters > maxAllowedLiters) {
    return `Error Forense: Los litros de combustible cargados (${liters} L) exceden el límite realista permitido para esta unidad (${maxAllowedLiters} L${
      unitCapacity > 0
        ? ` basado en una capacidad de tanque de ${unitCapacity} L`
        : ' como límite fallback'
    }).`;
  }
  return null;
};

export const validateTirePressures = (formData: RouteAssignmentFormData): string | null => {
  let tires: Record<string, unknown> = {};
  try {
    tires = JSON.parse(formData.tirePressureJson || '{}');
  } catch (e) {
    // Ignored
  }

  let errorMsg = null;
  ['DI', 'DD', 'TI', 'TD'].some((pos) => {
    const val = tires[pos];
    if (val !== undefined && val !== null) {
      const valStr = String(val);
      if (valStr.trim() !== '') {
        const numVal = Number(valStr);
        if (Number.isNaN(numVal) || numVal < 20 || numVal > 100) {
          errorMsg = `Error Forense: La presión del neumático ${pos} debe ser un valor realista entre 20 PSI y 100 PSI (detectado: "${valStr}").`;
          return true;
        }
      }
    }
    return false;
  });

  return errorMsg;
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
    destinationNeighborhoodId: undefined,
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

      const startFuel = Number(route.fuel_level_start ?? 100);
      const arrivalFuel = Number(route.fuel_level_end ?? route.fuel_level_start ?? 100);

      const liters = Number(route.fuel_liters_loaded || 0);

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
        calle: parsedCalle,
        numero: parsedNumero,
        numeroInterior: parsedNumeroInterior,
      });
    },
    [units, origins]
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
        destinationNeighborhoodId: undefined,
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
  const updateForm = useCallback((updates: Partial<RouteAssignmentFormData>): void => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

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
    const fuelValToSend = isFinished ? formData.arrivalFuelLevel : formData.fuelLevel;

    return {
      ...rest,
      destination: finalDest,
      operatorId: formData.operatorId ? Number(formData.operatorId) : undefined,
      originId: originId ? Number(originId) : undefined,
      destinationNeighborhoodId: formData.destinationNeighborhoodId
        ? Number(formData.destinationNeighborhoodId)
        : null,
      fuelLevel: roundToTwo(fuelValToSend),
      fuelLitersLoaded: roundToTwo(formData.fuelLitersLoaded),
      fuelAmount: roundToTwo(formData.fuelAmount),
      startReading: Number(formData.startReading || 0),
      endReading: Number(formData.endReading || 0),
      additivesCheck: formData.additivesCheck ? 1 : 0,
      tirePressureJson: formData.tirePressureJson || null,
      checklistJson: formData.checklistJson || null,
    };
  };

  const validateTelemetry = useCallback((): boolean => {
    const isClosingOrFinished = isFinished || (isEdit && Number(formData.endReading || 0) > 0);

    const odometerErr = validateReadingFailsafe(
      formData,
      selectedUnitData,
      isEdit,
      routeToEdit || null
    );
    if (odometerErr) {
      setError(odometerErr);
      return false;
    }

    if (isClosingOrFinished) {
      const distanceErr = validateDistance(formData);
      if (distanceErr) {
        setError(distanceErr);
        return false;
      }

      const fuelLvlErr = validateFuelLevel(formData);
      if (fuelLvlErr) {
        setError(fuelLvlErr);
        return false;
      }

      const fuelCohErr = validateFuelCoherency(formData, selectedUnitData);
      if (fuelCohErr) {
        setError(fuelCohErr);
        return false;
      }

      const tireErr = validateTirePressures(formData);
      if (tireErr) {
        setError(tireErr);
        return false;
      }
    }

    return true;
  }, [isEdit, isFinished, routeToEdit, formData, selectedUnitData]);

  const handleConfirmAudit = async (reason: string): Promise<void> => {
    if (!reason || reason.length < 5) {
      setError('La justificación debe tener al menos 5 caracteres.');
      return;
    }

    if (auditAction === 'UPDATE' && !validateTelemetry()) {
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

      // Clear forensic logs cache to enforce a fresh download
      archonCache.clear('forensic_journal_logs');

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

  const handleFinishMission = async (): Promise<void> => {
    if (!routeToEdit) return;
    await finishRoute(routeToEdit.uuid, {
      endReading: Number(formData.endReading),
      fuelLevelEnd: roundToTwo(formData.arrivalFuelLevel),
      fuelLitersLoaded: roundToTwo(formData.fuelLitersLoaded),
      fuelAmount: roundToTwo(formData.fuelAmount),
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
        destinationNeighborhoodId: formData.destinationNeighborhoodId
          ? Number(formData.destinationNeighborhoodId)
          : null,
        operatorId: formData.operatorId ? Number(formData.operatorId) : undefined,
        originId: origins.find((o) => o.label === formData.origin)?.id
          ? Number(origins.find((o) => o.label === formData.origin)?.id)
          : undefined,
        fuelLevel: roundToTwo(formData.fuelLevel),
        fuelLitersLoaded: roundToTwo(formData.fuelLitersLoaded),
        fuelAmount: roundToTwo(formData.fuelAmount),
      },
    });
    await refreshUnits();
  };

  const handleNewDispatch = async (finalDest: string): Promise<void> => {
    await startRoute({
      unitId: formData.unitId,
      driverId: Number(formData.operatorId),
      startReading: Number(formData.startReading),
      fuelLevelStart: roundToTwo(formData.fuelLevel),
      destination: finalDest,
      destinationNeighborhoodId: formData.destinationNeighborhoodId
        ? Number(formData.destinationNeighborhoodId)
        : undefined,
      originId: origins.find((o) => o.label === formData.origin)?.id
        ? Number(origins.find((o) => o.label === formData.origin)?.id)
        : undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validateTelemetry()) {
      return;
    }
    if (isFinished) {
      setAuditAction('UPDATE');
      setIsAuditModalOpen(true);
      return;
    }

    setSubmitting(true);
    setError(null);

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

      // Clear forensic logs cache to enforce fresh reload
      archonCache.clear('forensic_journal_logs');

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

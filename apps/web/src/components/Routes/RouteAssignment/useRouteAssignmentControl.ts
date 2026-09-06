import { FormEvent, useCallback, useState } from 'react';
import { useFleet } from '../../../context/FleetContext';
import { useUsers } from '../../../context/UserContext';
import { RouteLog } from '../RouteLogTable';
import { CatalogOption, FleetUnit } from '../../../types/fleet';
import { RouteAssignmentFormData } from './types';
import { SelectOption } from '../../ArchonSelect';
import { buildEmptyFormData } from './routeValidation';
import {
  useRouteCatalogData,
  useRouteHydration,
  useUnitSelectionSync,
  useRouteOptions,
  useRouteAssignmentSubmission,
} from './useRouteAssignmentSubHooks';

export { default as roundToTwo } from './routeMath';
export {
  parseAddress,
  getFinalDestination,
  validateReadingFailsafe,
  validateDistance,
  validateFuelLevel,
  validateFuelCoherency,
  validateTirePressures,
} from './routeValidation';

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
  handleSubmit: (e: FormEvent) => Promise<void>;
  triggerAuditDelete: () => void;
}

/**
 * 🔱 Archon Hook: useRouteAssignmentControl
 * Purpose: Centralizes the mission control logic, state management and forensics.
 * Scalability: Decouples business rules from the rendering layer.
 *
 * Orquestador — cada segmento de estado/efecto real vive en
 * `useRouteAssignmentSubHooks.ts` (catálogos, hidratación, sync de unidad,
 * opciones derivadas, envío/auditoría); este hook solo los compone
 * (FC165 F3 Slice3.2 Batch1, Dual-Gate Isolation).
 */
export const useRouteAssignmentControl = (
  onClose: () => void,
  routeToEdit?: RouteLog | null
): RouteAssignmentControl => {
  const { units, startRoute, finishRoute, refreshUnits } = useFleet();
  const { users } = useUsers();

  const isEdit = !!routeToEdit;
  const isFinished = !!routeToEdit?.end_time;

  const [formData, setFormData] = useState<RouteAssignmentFormData>(buildEmptyFormData);
  const [selectedUnitData, setSelectedUnitData] = useState<FleetUnit | null>(null);

  const { origins, activeRoutes } = useRouteCatalogData(routeToEdit);
  useRouteHydration(routeToEdit, units, origins, setFormData);
  useUnitSelectionSync(formData, units, isEdit, setSelectedUnitData, setFormData);
  const { availableUnits, operatorOptions } = useRouteOptions(
    units,
    isEdit,
    routeToEdit,
    users,
    activeRoutes
  );

  const updateForm = useCallback((updates: Partial<RouteAssignmentFormData>): void => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const submission = useRouteAssignmentSubmission({
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
  });

  return {
    formData,
    updateForm,
    isEdit,
    isFinished,
    origins,
    availableUnits,
    operatorOptions,
    selectedUnitData,
    ...submission,
  };
};

export default useRouteAssignmentControl;

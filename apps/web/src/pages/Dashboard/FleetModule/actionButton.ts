import { useEffect } from 'react';
import { PlusCircle, ShieldAlert } from 'lucide-react';
import { FleetUnit, ManagementPanel } from '../../../types/fleet';
import { useSovereignLayout } from '../../../context/SovereignLayoutContext';

export type FleetActionButton = Parameters<
  ReturnType<typeof useSovereignLayout>['setSectionData']
>[3];

export interface FleetActionButtonArgs {
  canCreate: boolean;
  canScopedWrite: boolean;
  editingUnit: FleetUnit | null;
  activePanel: ManagementPanel;
  handlePanelChange: (panel: ManagementPanel) => void;
  handleReturnToGrid: () => void;
}

/** Descriptor del botón de acción del header (Registrar/Cancelar), o
 * `undefined` si el usuario no tiene permiso — extraído de `FleetModule`
 * para mantenerlo bajo el presupuesto de Gate2 (FC165 F3 Slice3.1 Batch2,
 * Dual-Gate Isolation). */
export function buildFleetActionButton(args: FleetActionButtonArgs): FleetActionButton {
  const {
    canCreate,
    canScopedWrite,
    editingUnit,
    activePanel,
    handlePanelChange,
    handleReturnToGrid,
  } = args;
  const isExpanding = activePanel === 'EXPANSION' || !!editingUnit;
  // canCreate: gates the "Iniciar Registro" new-unit flow (fleet:write only).
  // Scoped-write users still get the cancel button when already in edit mode.
  if (!(canCreate || (canScopedWrite && isExpanding))) return undefined;
  return {
    variant: isExpanding ? 'navy' : 'emerald',
    headerTitle: isExpanding ? 'Cancelar' : 'Expansión de Flota',
    HeaderIcon: isExpanding ? ShieldAlert : PlusCircle,
    PayloadIcon: isExpanding ? ShieldAlert : PlusCircle,
    actionTitle: isExpanding ? 'Retorno' : 'Registrar',
    description: isExpanding ? 'Cancelar Registro' : 'Alta de Activos',
    buttonText: isExpanding ? 'Cerrar Formulario' : 'Iniciar Registro',
    isActive: isExpanding,
    testId: 'fleet-registration-btn',
    onClick: (): void => {
      if (editingUnit) handleReturnToGrid();
      else handlePanelChange(activePanel === 'EXPANSION' ? 'STRATEGY' : 'EXPANSION');
    },
  };
}

export interface FleetModuleSectionDataArgs extends FleetActionButtonArgs {
  setSectionData: ReturnType<typeof useSovereignLayout>['setSectionData'];
}

/** Publica título/descripción/botón de acción al layout — extraído de
 * `FleetModule` para mantenerlo bajo el presupuesto de Gate2 (FC165 F3
 * Slice3.1 Batch2, Dual-Gate Isolation). */
export function useFleetModuleSectionData(args: FleetModuleSectionDataArgs): void {
  const { setSectionData, editingUnit, canCreate, canScopedWrite, activePanel } = args;
  useEffect(() => {
    setSectionData(
      editingUnit ? `Rectificación: ${editingUnit.id}` : 'Administrar Unidades',
      editingUnit
        ? 'Protocolo de Gestión Forense Archon'
        : 'Administración de Activos, Registro Técnico & Optimización de Flota',
      null,
      buildFleetActionButton(args)
    );
  }, [editingUnit, activePanel, setSectionData, canCreate, canScopedWrite]);
}

import React, { useState } from 'react';
import api from '../../../api/client';
import { FleetUnit, CreateFleetUnit, ManagementPanel } from '../../../types/fleet';
import { mapUnitToFormData } from './fleetFormMapping';

export interface FleetPanelState {
  activePanel: ManagementPanel;
  setActivePanel: React.Dispatch<React.SetStateAction<ManagementPanel>>;
  editingUnit: FleetUnit | null;
  setEditingUnit: React.Dispatch<React.SetStateAction<FleetUnit | null>>;
  panelRef: React.RefObject<HTMLDivElement>;
  scrollToTop: () => void;
}

/** Panel activo + unidad en edición — declarado ANTES de `useFleetForm` (su
 * hidratación diferida depende de este estado); extraído de `FleetModule`
 * para mantenerlo bajo el presupuesto de Gate2 (FC165 F3 Slice3.1 Batch2,
 * Dual-Gate Isolation). */
export function useFleetPanelState(): FleetPanelState {
  const [activePanel, setActivePanel] = useState<ManagementPanel>('STRATEGY');
  const [editingUnit, setEditingUnit] = useState<FleetUnit | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // FC165 F3 Slice3.1 — purga: `panelRef` se adjunta a un <div> incondicional
  // del root, y `scrollIntoView` es un método estándar de todo
  // HTMLDivElement — el guard `if(panelRef.current?.scrollIntoView)` que
  // envolvía cada llamada era siempre-verdadero (censo vivo: 0 hits en su
  // lado falso tras la suite completa). Se conserva `?.` solo por el tipo.
  const scrollToTop = (): void => {
    setTimeout((): void => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return { activePanel, setActivePanel, editingUnit, setEditingUnit, panelRef, scrollToTop };
}

export interface FleetModuleHandlers {
  handlePanelChange: (panel: ManagementPanel) => void;
  handleReturnToGrid: () => void;
  handleEditUnit: (unit: FleetUnit) => Promise<void>;
}

/** Handlers de navegación entre paneles — ver nota de `useFleetPanelState`. */
export function useFleetModuleHandlers(
  panel: FleetPanelState,
  fleetController: {
    setRegistrationSuccess: (v: boolean) => void;
    hydrateEditUnit: (data: CreateFleetUnit) => Promise<void>;
  }
): FleetModuleHandlers {
  const { setActivePanel, setEditingUnit, scrollToTop } = panel;
  const { setRegistrationSuccess } = fleetController;

  const handlePanelChange = (p: ManagementPanel): void => {
    setActivePanel(p);
    setRegistrationSuccess(false);
    scrollToTop();
  };

  const handleReturnToGrid = (): void => {
    setActivePanel('STRATEGY');
    setEditingUnit(null);
    setRegistrationSuccess(false);
  };

  const handleEditUnit = async (unit: FleetUnit): Promise<void> => {
    try {
      // 🔱 Lazy Load: Fetch full unit profile (including heavy assets)
      const response = await api.get(`/fleet/${unit.id}`);
      const fullUnit = response.data.data;
      setEditingUnit(fullUnit);
      setActivePanel('EXPANSION');
      setRegistrationSuccess(false);
      // 🔱 HYDRATE CONTROLLER
      await fleetController.hydrateEditUnit(mapUnitToFormData(fullUnit));
      scrollToTop();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load full unit profile:', error);
    }
  };

  return { handlePanelChange, handleReturnToGrid, handleEditUnit };
}

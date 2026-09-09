import React from 'react';
import { useLocation } from 'react-router';
import { useFleet } from '../../context/FleetContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import usePermissions from '../../hooks/usePermissions';
import useFleetForm from '../../hooks/useFleetForm';
import useFleetModuleUrlSearch from './FleetModule/useFleetModuleUrlSearch';
import { useFleetPanelState, useFleetModuleHandlers } from './FleetModule/useFleetModuleNav';
import { useFleetModuleSectionData } from './FleetModule/actionButton';
import FleetModuleBody from './FleetModule/FleetModuleBody';

export { mapUnitToFormData, daysUntil, deriveFleetAlert } from './FleetModule/fleetFormMapping';

/**
 * 🚀 ARCHON FLEET MODULE (v.28.19.0 — v.29.0.0 FC165 F3 Slice3.1 Batch2:
 * split en `FleetModule/`, Dual-Gate Isolation)
 * Architecture: Sovereign Instrumental Node
 * Principles: SOLID, DRY, DIP
 * Refinement: Centralized Header/Footer via SovereignLayoutContext
 */
const FleetModule: React.FC = (): React.ReactElement => {
  const { refreshUnits, units, loading } = useFleet();
  const { setSectionData, setSearchTerm } = useSovereignLayout();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('fleet:write');
  const canScopedWrite = hasPermission('fleet:write:scoped');
  const location = useLocation();

  useFleetModuleUrlSearch(location.search, setSearchTerm);

  const panel = useFleetPanelState();
  const { activePanel, editingUnit, panelRef } = panel;

  // 🔱 CENTRALIZED STATE HOOK (DIP compliant)
  // Deferred Hydration: Only start catalog sync when expansion panel is requested
  const fleetController = useFleetForm(activePanel === 'EXPANSION' || !!editingUnit);
  const { formData, registrationSuccess } = fleetController;
  const { handlePanelChange, handleReturnToGrid, handleEditUnit } = useFleetModuleHandlers(
    panel,
    fleetController
  );

  useFleetModuleSectionData({
    setSectionData,
    canCreate,
    canScopedWrite,
    editingUnit,
    activePanel,
    handlePanelChange,
    handleReturnToGrid,
  });

  return (
    <div className="animate-in fade-in duration-700">
      {/* 📊 BODY MODULAR */}
      <section className="archon-workspace-chassis">
        {/* 🔱 AXIAL SYNC CONTAINER */}
        <div className="archon-axial-container">
          <FleetModuleBody
            panelRef={panelRef}
            registrationSuccess={registrationSuccess}
            formData={formData}
            activePanel={activePanel}
            units={units}
            loading={loading}
            handleEditUnit={handleEditUnit}
            fleetController={fleetController}
            editingUnit={editingUnit}
            refreshUnits={refreshUnits}
            handleReturnToGrid={handleReturnToGrid}
          />
        </div>
      </section>
    </div>
  );
};

export default FleetModule;

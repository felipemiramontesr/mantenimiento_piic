import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';

import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { FleetUnit, CreateFleetUnit } from '../../types/fleet';

// 🔱 Specialized Sub-components (Silicon Valley Standards)
import FleetManagementCards, { ManagementPanel } from '../../components/Fleet/FleetManagementCards';
import FleetGridView from '../../components/Fleet/FleetGridView';
import api from '../../api/client';
import FleetRegistrationForm from '../../components/Fleet/FleetRegistrationForm';
import FleetSuccessView from '../../components/Fleet/FleetSuccessView';
import useFleetForm from '../../hooks/useFleetForm';

/**
 * 🚀 ARCHON FLEET MODULE (v.28.19.0)
 * Architecture: Sovereign Instrumental Node
 * Principles: SOLID, DRY, DIP
 * Refinement: Centralized Header/Footer via SovereignLayoutContext
 */

const mapBaseIds = (unit: FleetUnit): Partial<CreateFleetUnit> => ({
  assetTypeId: unit.assetTypeId || 0,
  brandId: unit.brandId || 0,
  modelId: unit.modelId || 0,
  departmentId: unit.departmentId || undefined,
  operationalUseId: unit.operationalUseId || undefined,
  locationId: unit.locationId || undefined,
  engineTypeId: unit.engineTypeId || undefined,
  traccionId: unit.traccionId || 0,
  transmisionId: unit.transmisionId || 0,
  fuelTypeId: unit.fuelTypeId || 0,
  colorId: unit.colorId || undefined,
  maintenanceCenterId: unit.maintenanceCenterId || undefined,
});

const mapOperationalData = (unit: FleetUnit): Partial<CreateFleetUnit> => ({
  placas: unit.placas || undefined,
  numeroSerie: unit.numeroSerie || undefined,
  year: unit.year || 2024,
  tireSpec: unit.tireSpec || undefined,
  tireBrandId: unit.tireBrandId || undefined,
  terrainTypeId: unit.terrainTypeId || undefined,
  capacidadCarga: unit.capacidadCarga || undefined,
  fuelTankCapacity: unit.fuelTankCapacity || 0,
  odometer: unit.odometer || 0,
  protocolStartDate: unit.protocolStartDate || undefined,
  maintIntervalDays: unit.maintIntervalDays || 90,
  maintIntervalKm: unit.maintIntervalKm || 5000,
  lastServiceDate: unit.lastServiceDate || undefined,
  lastServiceReading: unit.lastServiceReading || 0,
  dailyUsageAvg: unit.dailyUsageAvg || undefined,
});

const mapLegalData = (unit: FleetUnit): Partial<CreateFleetUnit> => ({
  vencimientoVerificacion: unit.vencimientoVerificacion || undefined,
  circulationCardNumber: unit.circulationCardNumber || undefined,
  accountingAccount: unit.accountingAccount || undefined,
  legalComplianceDate: unit.legalComplianceDate || undefined,
  insuranceExpiryDate: unit.insuranceExpiryDate || undefined,
  insuranceCompanyId: unit.insuranceCompanyId || undefined,
  environmentalHologram: unit.environmentalHologram || undefined,
  monthlyLeasePayment: unit.monthlyLeasePayment || 0,
  ownerId: unit.ownerId || undefined,
  complianceStatusId: unit.complianceStatusId || undefined,
});

const mapUnitToFormData = (unit: FleetUnit): CreateFleetUnit =>
  ({
    id: unit.id,
    images: unit.images || [],
    status: unit.status,
    description: unit.routeDescription || undefined,
    ...mapBaseIds(unit),
    ...mapOperationalData(unit),
    ...mapLegalData(unit),
  } as CreateFleetUnit);

const FleetModule: React.FC = (): React.ReactElement => {
  const { refreshUnits, units, loading } = useFleet();
  const { setSectionData } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<ManagementPanel>('STRATEGY');
  const [editingUnit, setEditingUnit] = useState<FleetUnit | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // 🔱 CENTRALIZED STATE HOOK (DIP compliant)
  const fleetController = useFleetForm();
  const { formData, registrationSuccess, setRegistrationSuccess } = fleetController;

  const handlePanelChange = (panel: ManagementPanel): void => {
    setActivePanel(panel);
    setRegistrationSuccess(false);

    if (panelRef.current?.scrollIntoView) {
      setTimeout((): void => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
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
      fleetController.setFormData(mapUnitToFormData(fullUnit));
      if (fullUnit.assetTypeId) fleetController.handleAssetTypeChange(fullUnit.assetTypeId);
      if (fullUnit.brandId) fleetController.handleMarcaChange(fullUnit.brandId);

      if (panelRef.current?.scrollIntoView) {
        setTimeout((): void => {
          panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load full unit profile:', error);
    }
  };

  useEffect(() => {
    setSectionData(
      editingUnit ? `Rectificación: ${editingUnit.id}` : 'Administrar Unidades',
      editingUnit
        ? 'Protocolo de Gestión Forense Archon'
        : 'Administración de Activos, Registro Técnico & Optimización de Flota',
      <FleetManagementCards activePanel={activePanel} onPanelChange={handlePanelChange} />
    );
  }, [editingUnit, activePanel, setSectionData]);

  return (
    <div className="animate-in fade-in duration-700">
      {/* 📊 BODY MODULAR */}
      <section className="archon-workspace-chassis w-full max-w-full overflow-hidden">
        {/* 🔱 AXIAL SYNC CONTAINER */}
        <div className="archon-axial-container flex flex-col gap-12 w-full max-w-full">
          <div ref={panelRef}>
            {registrationSuccess ? (
              <FleetSuccessView formData={formData} />
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {activePanel === 'STRATEGY' && (
                  <FleetGridView units={units} loading={loading} onEdit={handleEditUnit} />
                )}
                {activePanel === 'EXPANSION' && (
                  <FleetRegistrationForm
                    controller={fleetController}
                    onSuccess={async (): Promise<void> => {
                      await refreshUnits();
                      handleReturnToGrid();
                    }}
                    onCancel={handleReturnToGrid}
                    isEdit={!!editingUnit}
                    unitId={editingUnit?.id}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FleetModule;

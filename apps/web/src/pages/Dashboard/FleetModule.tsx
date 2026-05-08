import React, { useState } from 'react';
import { Truck, ShieldCheck } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { BRANDING_NAME, SYSTEM_VERSION } from '../../constants/versionConstants';
import { FleetUnit, CreateFleetUnit } from '../../types/fleet';

// 🔱 Specialized Sub-components (Silicon Valley Standards)
import FleetManagementCards, { ManagementPanel } from '../../components/Fleet/FleetManagementCards';
import FleetGridView from '../../components/Fleet/FleetGridView';
import FleetRegistrationForm from '../../components/Fleet/FleetRegistrationForm';
import FleetSuccessView from '../../components/Fleet/FleetSuccessView';
import useFleetForm from '../../hooks/useFleetForm';

/**
 * 🚀 ARCHON FLEET MODULE (v.28.19.0)
 * Architecture: Sovereign Instrumental Node
 * Principles: SOLID, DRY, DIP
 * Refinement: Dynamic Panel Orchestration with Axial Scroll
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
  const [activePanel, setActivePanel] = useState<ManagementPanel>('STRATEGY');
  const [editingUnit, setEditingUnit] = useState<FleetUnit | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // 🔱 CENTRALIZED STATE HOOK (DIP compliant)
  const fleetController = useFleetForm();
  const { formData, registrationSuccess, setRegistrationSuccess } = fleetController;

  const handlePanelChange = (panel: ManagementPanel): void => {
    setActivePanel(panel);
    setRegistrationSuccess(false);

    // 🚀 AXIAL SCROLL (Subtle & Smooth)
    // Feature detection for professional-grade resilience in all environments
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

  const handleEditUnit = (unit: FleetUnit): void => {
    setEditingUnit(unit);
    setActivePanel('EXPANSION');
    setRegistrationSuccess(false);

    // 🔱 HYDRATE CONTROLLER
    fleetController.setFormData(mapUnitToFormData(unit));
    if (unit.assetTypeId) fleetController.handleAssetTypeChange(unit.assetTypeId);
    if (unit.brandId) fleetController.handleMarcaChange(unit.brandId);

    if (panelRef.current?.scrollIntoView) {
      setTimeout((): void => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER SOBERANO (Dual Panel) */}
      <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Left Panel: Operational Context */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <Truck size={28} style={{ color: '#f2b705' }} />
              <h2
                className="text-[#0f2a44] tracking-tighter font-black text-2xl"
                style={{ margin: 0, padding: 0, lineHeight: 1 }}
              >
                {editingUnit
                  ? `Rectificación de Activo: ${editingUnit.id}`
                  : 'Administrar Unidades'}
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              {editingUnit
                ? 'Protocolo de Gestión Forense Archon'
                : 'Administración de Activos, Registro Técnico & Optimización de Flota'}
            </p>
          </div>

          {/* Right Panel: Identity & Access - HANDLED BY GLOBAL TOPBAR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              position: 'relative',
              width: '44px',
              height: '44px',
            }}
          >
            {/* Placeholder to maintain header symmetry if needed, or leave empty */}
          </div>
        </div>
      </header>

      {/* 🔱 HEADER KPI GRID (Symmetry Pro) */}
      <section className="px-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Logistics & Forensics */}
          <div className="glass-card-pro bg-white p-8 border-t-4 border-[#0f2a44] flex items-center justify-between group hover:shadow-2xl transition-all duration-500">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-navy-400 uppercase tracking-[0.3em] mb-2">
                Ecosistema de Gestión
              </span>
              <h3 className="text-2xl font-black text-navy-900 tracking-tight mb-1">
                Logística Operativa
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Auditoría Forense • Rastro Inmutable
                </span>
              </div>
            </div>
            <div className="w-16 h-16 rounded-[4px] bg-navy-50 flex items-center justify-center text-navy-900 group-hover:bg-navy-900 group-hover:text-white transition-colors duration-500">
              <Truck size={32} />
            </div>
          </div>

          {/* Card 2: Emerald Status */}
          <div className="glass-card-pro bg-[#10b981] p-8 flex items-center justify-between group hover:shadow-2xl transition-all duration-500 border-none">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-2">
                Disponibilidad Táctica
              </span>
              <h3 className="text-2xl font-black text-white tracking-tight mb-1">
                Flota Archon Elite
              </h3>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-white/80" />
                <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">
                  Certificación Industrial V.78.0
                </span>
              </div>
            </div>
            <div className="w-16 h-16 rounded-[4px] bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
              <ShieldCheck size={32} />
            </div>
          </div>
        </div>
      </section>

      {/* 📊 BODY MODULAR */}
      <section className="archon-workspace-chassis w-full max-w-full overflow-hidden">
        {/* 🔱 AXIAL SYNC CONTAINER (v.28.37.0) */}
        <div className="archon-axial-container flex flex-col gap-12 w-full max-w-full">
          <FleetManagementCards activePanel={activePanel} onPanelChange={handlePanelChange} />

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

      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by PIIC GROUP.</p>
        <p className="text-[#0f2a44]">
          {BRANDING_NAME} {SYSTEM_VERSION}
        </p>
      </footer>
    </main>
  );
};

export default FleetModule;

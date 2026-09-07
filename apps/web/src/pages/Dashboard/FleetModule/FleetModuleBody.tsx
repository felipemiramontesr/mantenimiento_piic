import React from 'react';
import { FleetUnit, CreateFleetUnit, ManagementPanel } from '../../../types/fleet';
import FleetGridView from '../../../components/Fleet/FleetGridView';
import FleetRegistrationForm from '../../../components/Fleet/FleetRegistrationForm';
import FleetSuccessView from '../../../components/Fleet/FleetSuccessView';
import ArchonAdaptiveView from '../../../components/Common/ArchonAdaptiveView';
import ArchonCardView from '../../../components/Common/ArchonCardView';
import renderFleetCard from './FleetUnitCard';

interface FleetStrategyViewProps {
  readonly units: FleetUnit[];
  readonly loading: boolean;
  readonly handleEditUnit: (unit: FleetUnit) => Promise<void>;
}

/** Vista STRATEGY (tabla/tarjetas de flota) — extraída de `FleetModuleBody`
 * para mantenerlo bajo el presupuesto de Gate2. */
function FleetStrategyView({
  units,
  loading,
  handleEditUnit,
}: FleetStrategyViewProps): React.JSX.Element {
  return (
    <ArchonAdaptiveView
      storageKey="fleet-strategy"
      views={{
        TABLE: <FleetGridView units={units} loading={loading} onEdit={handleEditUnit} />,
        CARDS: (
          <ArchonCardView<FleetUnit>
            items={units}
            keyExtractor={(unit): string => unit.id}
            renderCard={renderFleetCard}
            onCardClick={handleEditUnit}
            emptyMessage="SIN UNIDADES REGISTRADAS"
          />
        ),
      }}
    />
  );
}

export interface FleetModuleBodyProps {
  readonly panelRef: React.RefObject<HTMLDivElement>;
  readonly registrationSuccess: boolean;
  readonly formData: CreateFleetUnit;
  readonly activePanel: ManagementPanel;
  readonly units: FleetUnit[];
  readonly loading: boolean;
  readonly handleEditUnit: (unit: FleetUnit) => Promise<void>;
  readonly fleetController: Parameters<typeof FleetRegistrationForm>[0]['controller'];
  readonly editingUnit: FleetUnit | null;
  readonly refreshUnits: () => Promise<void>;
  readonly handleReturnToGrid: () => void;
}

/** Cuerpo del módulo: grid/tarjetas de la flota, o el formulario de alta/edición
 * — extraído de `FleetModule` para mantenerlo bajo el presupuesto de Gate2
 * (FC165 F3 Slice3.1 Batch2, Dual-Gate Isolation). */
export default function FleetModuleBody({
  panelRef,
  registrationSuccess,
  formData,
  activePanel,
  units,
  loading,
  handleEditUnit,
  fleetController,
  editingUnit,
  refreshUnits,
  handleReturnToGrid,
}: FleetModuleBodyProps): React.JSX.Element {
  return (
    <div ref={panelRef}>
      {registrationSuccess ? (
        <FleetSuccessView formData={formData} />
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {activePanel === 'STRATEGY' && (
            <FleetStrategyView units={units} loading={loading} handleEditUnit={handleEditUnit} />
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
  );
}

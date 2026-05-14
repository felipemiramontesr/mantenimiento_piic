import React from 'react';
import { LayoutDashboard, PlusCircle, Shield } from 'lucide-react';
import usePermissions from '../../hooks/usePermissions';
import ArchonManagementCard from '../UI/ArchonManagementCard';

export type ManagementPanel = 'STRATEGY' | 'EXPANSION';

interface FleetManagementCardsProps {
  activePanel: ManagementPanel;
  onPanelChange: (panel: ManagementPanel) => void;
}

const FleetManagementCards: React.FC<FleetManagementCardsProps> = ({
  activePanel,
  onPanelChange,
}) => {
  const { hasPermission } = usePermissions();

  return (
    <div className="archon-grid-2-sovereign animate-in fade-in slide-in-from-top-4 duration-700">
      <ArchonManagementCard
        variant="navy"
        headerTitle="Estrategia Operativa"
        HeaderIcon={LayoutDashboard}
        PayloadIcon={Shield}
        actionTitle="Administración"
        description="Control de Inventario"
        buttonText="Ver Detalles"
        isActive={activePanel === 'STRATEGY'}
        onClick={(): void => onPanelChange('STRATEGY')}
        testId="fleet-strategy-btn"
      />

      {hasPermission('fleet:write') && (
        <ArchonManagementCard
          variant="emerald"
          headerTitle="Expansión de Flota"
          HeaderIcon={PlusCircle}
          PayloadIcon={PlusCircle}
          actionTitle="Registrar"
          description="Alta de Activos"
          buttonText="Iniciar Registro"
          isActive={activePanel === 'EXPANSION'}
          onClick={(): void => onPanelChange('EXPANSION')}
          testId="fleet-registration-btn"
        />
      )}
    </div>
  );
};

export default FleetManagementCards;

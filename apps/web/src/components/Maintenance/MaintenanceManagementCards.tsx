import React from 'react';
import { ClipboardList, Wrench, History } from 'lucide-react';
import ArchonManagementCard from '../UI/ArchonManagementCard';

export type MaintenancePanel = 'HISTORY' | 'SCHEDULE';

interface MaintenanceManagementCardsProps {
  activePanel: MaintenancePanel;
  onPanelChange: (panel: MaintenancePanel) => void;
}

/**
 * 🛠️ ARCHON COMPONENT: MaintenanceManagementCards
 * Implementation: Dual-Axis Symmetry Selector (Standard)
 * Theme: Maintenance (Navy & Emerald)
 */
const MaintenanceManagementCards: React.FC<MaintenanceManagementCardsProps> = ({
  activePanel,
  onPanelChange,
}) => (
  <div className="archon-central-axis animate-in fade-in slide-in-from-top-4 duration-700">
    <div className="archon-grid-2 gap-8 mb-8">
      <ArchonManagementCard
        variant="navy"
        headerTitle="Bitácora de Servicios"
        HeaderIcon={History}
        PayloadIcon={ClipboardList}
        actionTitle="Historial"
        description="Control de Servicios Pasados"
        buttonText="Ver Bitácora"
        isActive={activePanel === 'HISTORY'}
        onClick={(): void => onPanelChange('HISTORY')}
      />

      <ArchonManagementCard
        variant="emerald"
        headerTitle="Gestión de Servicios"
        HeaderIcon={Wrench}
        PayloadIcon={Wrench}
        actionTitle="Programar"
        description="Alta de Nuevo Mantenimiento"
        buttonText="Iniciar Registro"
        isActive={activePanel === 'SCHEDULE'}
        onClick={(): void => onPanelChange('SCHEDULE')}
      />
    </div>
  </div>
);

export default MaintenanceManagementCards;

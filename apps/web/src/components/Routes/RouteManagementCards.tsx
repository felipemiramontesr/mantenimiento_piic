import React from 'react';
import { History, MapPin, Shield } from 'lucide-react';
import ArchonManagementCard from '../UI/ArchonManagementCard';

export type RoutePanel = 'LOGS' | 'DISPATCH' | 'JOURNAL';

interface RouteManagementCardsProps {
  activePanel: RoutePanel;
  onPanelChange: (panel: RoutePanel) => void;
  onAction?: (action: 'DESPACHO' | 'BITACORA' | 'FORENSE') => void;
}

const RouteManagementCards: React.FC<RouteManagementCardsProps> = ({
  activePanel,
  onPanelChange,
  onAction,
}) => (
  <div className="archon-grid-2-sovereign animate-in fade-in slide-in-from-top-4 duration-700">
    <ArchonManagementCard
      variant="navy"
      headerTitle="Logística & Auditoría"
      HeaderIcon={History}
      PayloadIcon={Shield}
      actionTitle="Administración"
      description="Histórico • Journal Forense"
      buttonText="Ver Bitácora"
      isActive={activePanel === 'LOGS' || activePanel === 'JOURNAL'}
      onClick={(e: React.MouseEvent): void => {
        e.stopPropagation();
        if (onAction) onAction('BITACORA');
        onPanelChange('LOGS');
      }}
    />

    <ArchonManagementCard
      variant="emerald"
      headerTitle="Control de Tránsito"
      HeaderIcon={MapPin}
      PayloadIcon={MapPin}
      actionTitle="Asignación de Ruta"
      description="Nueva Asignación"
      buttonText="Iniciar"
      isActive={activePanel === 'DISPATCH'}
      onClick={(e: React.MouseEvent): void => {
        e.stopPropagation();
        if (onAction) onAction('DESPACHO');
        onPanelChange('DISPATCH');
      }}
    />
  </div>
);

export default RouteManagementCards;

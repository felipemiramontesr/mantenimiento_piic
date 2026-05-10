import React from 'react';
import { Database, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';
import ArchonManagementCard from '../UI/ArchonManagementCard';

export type LogsPanel = 'FORENSIC' | 'INCIDENTS';

interface LogsManagementCardsProps {
  activePanel: LogsPanel;
  onPanelChange: (panel: LogsPanel) => void;
}

const LogsManagementCards: React.FC<LogsManagementCardsProps> = ({
  activePanel,
  onPanelChange,
}) => (
  <div className="archon-central-axis animate-in fade-in slide-in-from-top-4 duration-700">
    <div className="archon-grid-2 gap-8 mb-8">
      <ArchonManagementCard
        variant="navy"
        headerTitle="Auditoría del Sistema"
        HeaderIcon={ShieldCheck}
        PayloadIcon={Database}
        actionTitle="Bitácora Forense"
        description="Trazabilidad de Eventos"
        buttonText="Ver Bitácora"
        isActive={activePanel === 'FORENSIC'}
        onClick={(): void => onPanelChange('FORENSIC')}
        testId="logs-forensic-btn"
      />

      <ArchonManagementCard
        variant="red"
        headerTitle="Monitoreo Crítico"
        HeaderIcon={Flame}
        PayloadIcon={AlertTriangle}
        actionTitle="Bitácora de Incidencias"
        description="Reporte de Anomalías"
        buttonText="Ver Incidencias"
        isActive={activePanel === 'INCIDENTS'}
        onClick={(): void => onPanelChange('INCIDENTS')}
        testId="logs-incidents-btn"
      />
    </div>
  </div>
);

export default LogsManagementCards;

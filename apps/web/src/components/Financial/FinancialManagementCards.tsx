import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Wallet } from 'lucide-react';
import ArchonManagementCard from '../UI/ArchonManagementCard';

export type FinancialPanel = 'AUDIT' | 'OPTIMIZATION';

interface FinancialManagementCardsProps {
  activePanel: FinancialPanel;
  onPanelChange: (panel: FinancialPanel) => void;
}

/**
 * 🔱 Archon Component: FinancialManagementCards
 * Implementation: Dual-Axis Symmetry Selector (V.78.100.91)
 * Theme: Financial Health (Navy & Emerald Integration)
 * Refactor: Forcing 2-Column Grid on all workspace resolutions.
 */
const FinancialManagementCards: React.FC<FinancialManagementCardsProps> = ({
  activePanel,
  onPanelChange,
}) => (
  <div className="grid grid-cols-2 gap-10 w-full animate-in fade-in slide-in-from-top-4 duration-700">
    <ArchonManagementCard
      variant="navy"
      headerTitle="Auditoría de Costos"
      HeaderIcon={BarChart3}
      PayloadIcon={DollarSign}
      actionTitle="Análisis"
      description="Control de Egresos & Leasing"
      buttonText="Ver Auditoría"
      isActive={activePanel === 'AUDIT'}
      onClick={(): void => onPanelChange('AUDIT')}
    />

    <ArchonManagementCard
      variant="emerald"
      headerTitle="Optimización de ROI"
      HeaderIcon={TrendingUp}
      PayloadIcon={Wallet}
      actionTitle="Eficiencia"
      description="Proyección de Ahorro & Salud"
      buttonText="Analizar ROI"
      isActive={activePanel === 'OPTIMIZATION'}
      onClick={(): void => onPanelChange('OPTIMIZATION')}
    />
  </div>
);

export default FinancialManagementCards;

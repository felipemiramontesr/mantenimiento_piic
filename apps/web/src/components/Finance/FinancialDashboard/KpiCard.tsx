import React from 'react';
import {
  ArrowRight,
  DollarSign,
  Fuel,
  ShieldCheck,
  TrendingDown,
  Truck,
  Wrench,
} from 'lucide-react';
import { FinanceCategory, FinanceDashboardKpis } from '../../../types/finance';
import { formatMXN } from './helpers';

export interface KpiCardProps {
  label: string;
  value: string;
  Icon: React.ElementType;
  accentColor: string;
  description: string;
  onAction: () => void;
  actionLabel: string;
}

/** Tarjeta KPI — patrón soberano (idéntico a ArchonCenter.renderKPI) (FC163 F2B3, split). */
export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  Icon,
  accentColor,
  description,
  onAction,
  actionLabel,
}): React.ReactElement => (
  <div
    className="card-archon-sovereign animate-in fade-in duration-500 min-h-[360px]"
    style={{ '--card-accent': accentColor } as React.CSSProperties}
  >
    <div className="card-sovereign-header">
      <Icon size={20} style={{ color: accentColor }} />
      <span className="card-sovereign-title">{label}</span>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center pb-8">
      <div className="flex flex-col items-center justify-center text-center w-full space-y-1">
        <h3 className="card-sovereign-kpi-value">{value}</h3>
        <p className="card-sovereign-kpi-label">{description}</p>
      </div>
    </div>
    <button type="button" onClick={onAction} className="btn-archon-card-action">
      {actionLabel} <ArrowRight size={12} className="ml-2" />
    </button>
  </div>
);

type KpiValueKey = keyof FinanceDashboardKpis;

interface KpiDefinition {
  key: KpiValueKey;
  label: string;
  Icon: React.ElementType;
  accentColor: string;
  description: string;
  category?: FinanceCategory;
  actionLabel: string;
}

// Definición estática de las 6 tarjetas KPI — orden = orden visual (FC163 F2B3, split).
const KPI_DEFINITIONS: KpiDefinition[] = [
  {
    key: 'totalEgresos',
    label: 'Total egresos',
    Icon: DollarSign,
    accentColor: '#0f2a44',
    description: 'Egresos registrados en el período',
    actionLabel: 'Ver todos los egresos',
  },
  {
    key: 'totalMaintenance',
    label: 'Mantenimiento',
    Icon: Wrench,
    accentColor: '#f59e0b',
    description: 'Costo acumulado de servicios',
    category: 'MAINTENANCE',
    actionLabel: 'Ver mantenimientos',
  },
  {
    key: 'totalFuel',
    label: 'Combustible',
    Icon: Fuel,
    accentColor: '#10b981',
    description: 'Combustible y rutas en el período',
    category: 'FUEL',
    actionLabel: 'Ver combustible',
  },
  {
    key: 'totalInsurance',
    label: 'Seguro',
    Icon: ShieldCheck,
    accentColor: '#3b82f6',
    description: 'Primas de seguro de la flotilla',
    category: 'INSURANCE',
    actionLabel: 'Ver seguros',
  },
  {
    key: 'totalLease',
    label: 'Arrendamiento (flota)',
    Icon: Truck,
    accentColor: '#8b5cf6',
    description: 'Compromiso mensual fijo de la flota',
    category: 'LEASE',
    actionLabel: 'Ver arrendamientos',
  },
  {
    key: 'avgCostPerUnit',
    label: 'Costo promedio / unidad',
    Icon: TrendingDown,
    accentColor: '#C12020',
    description: 'Por unidad activa en el período',
    actionLabel: 'Ver análisis de costos',
  },
];

/** Construye las 6 tarjetas KPI a partir de los datos del dashboard (FC163 F2B3, split). */
export function buildKpiCards(
  kpis: FinanceDashboardKpis,
  onNavigateToEgresos: (category?: FinanceCategory) => void
): KpiCardProps[] {
  return KPI_DEFINITIONS.map((def) => ({
    label: def.label,
    value: formatMXN(kpis[def.key]),
    Icon: def.Icon,
    accentColor: def.accentColor,
    description: def.description,
    // Preserva la aridad exacta de la llamada original: sin categoría, cero args
    // (no onNavigateToEgresos(undefined)) — algunos consumidores distinguen ambos.
    onAction: (): void =>
      def.category ? onNavigateToEgresos(def.category) : onNavigateToEgresos(),
    actionLabel: def.actionLabel,
  }));
}

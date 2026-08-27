import React, { useState } from 'react';
import { DateRange, FinanceCategory } from '../../types/finance';
import PeriodRangePicker from './PeriodRangePicker';
import { KpiCard, buildKpiCards } from './FinancialDashboard/KpiCard';
import { CategoryDonutCard } from './FinancialDashboard/CategoryDonutCard';
import { MonthlyTrendCard } from './FinancialDashboard/MonthlyTrendCard';
import { TopUnitsCard } from './FinancialDashboard/TopUnitsCard';
import {
  DashboardErrorView,
  DashboardLoadingSkeleton,
} from './FinancialDashboard/DashboardStatusViews';
import { useFinancialDashboardData } from './FinancialDashboard/useFinancialDashboardData';

type OptionalCategory = FinanceCategory | undefined;

interface FinancialDashboardProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onNavigateToEgresos: (category?: OptionalCategory) => void;
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  dateRange,
  onDateRangeChange,
  onNavigateToEgresos,
}): React.ReactElement => {
  const { data, loading, error } = useFinancialDashboardData(dateRange);
  const [chartLabel, setChartLabel] = useState<string>('6M');

  if (loading) return <DashboardLoadingSkeleton />;
  if (error || !data) return <DashboardErrorView error={error} />;

  const { kpis, byCategory, byMonth, topUnits } = data;
  const kpiCards = buildKpiCards(kpis, onNavigateToEgresos);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PeriodRangePicker value={dateRange} onChange={onDateRangeChange} />

      <div className="archon-grid-sovereign">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategoryDonutCard byCategory={byCategory} />
        <MonthlyTrendCard
          byMonth={byMonth}
          chartLabel={chartLabel}
          onChartLabelChange={setChartLabel}
        />
      </div>

      <TopUnitsCard topUnits={topUnits} totalEgresos={kpis.totalEgresos} dateRange={dateRange} />
    </div>
  );
};

export default FinancialDashboard;

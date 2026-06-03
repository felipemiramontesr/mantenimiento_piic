import React, { useState, useEffect, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import {
  DollarSign,
  Wrench,
  Fuel,
  ShieldCheck,
  Truck,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import api from '../../api/client';
import {
  FinanceDashboardData,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  FinanceCategory,
  DateRange,
} from '../../types/finance';
import PeriodRangePicker from './PeriodRangePicker';

// ─── Types ────────────────────────────────────────────────────────────────────

type OptionalCategory = FinanceCategory | undefined;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMXN(value: number): string {
  return value.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  });
}

function periodLabel(period: string): string {
  const [y, m] = period.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
}

// ─── KPI Card — patrón soberano (idéntico a ArchonCenter.renderKPI) ───────────

interface KpiCardProps {
  label: string;
  value: string;
  Icon: React.ElementType;
  accentColor: string;
  description: string;
  onAction: () => void;
  actionLabel: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
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
    <button onClick={onAction} className="btn-archon-card-action">
      {actionLabel} <ArrowRight size={12} className="ml-2" />
    </button>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

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
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartLabel, setChartLabel] = useState<string>('6M');

  const fetchDashboard = useCallback(async (range: DateRange): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: FinanceDashboardData }>(
        `/finance/dashboard?from=${range.from}&to=${range.to}`
      );
      setData(res.data.data);
    } catch {
      setError('No se pudieron cargar los datos financieros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect((): void => {
    fetchDashboard(dateRange);
  }, [dateRange, fetchDashboard]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="archon-grid-sovereign">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card-archon-sovereign h-64 bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="card-archon-sovereign h-64 bg-slate-100" />
          <div className="card-archon-sovereign h-64 bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card-archon-sovereign flex items-center justify-center h-48">
        <p className="text-[12px] font-bold text-sentinel-red uppercase tracking-widest">
          {error ?? 'Sin datos'}
        </p>
      </div>
    );
  }

  const { kpis, byCategory, byMonth, topUnits } = data;

  const kpiCards: KpiCardProps[] = [
    {
      label: 'Total egresos',
      value: formatMXN(kpis.totalEgresos),
      Icon: DollarSign,
      accentColor: '#0f2a44',
      description: 'Egresos registrados en el período',
      onAction: (): void => onNavigateToEgresos(),
      actionLabel: 'Ver todos los egresos',
    },
    {
      label: 'Mantenimiento',
      value: formatMXN(kpis.totalMaintenance),
      Icon: Wrench,
      accentColor: '#f59e0b',
      description: 'Costo acumulado de servicios',
      onAction: (): void => onNavigateToEgresos('MAINTENANCE'),
      actionLabel: 'Ver mantenimientos',
    },
    {
      label: 'Combustible',
      value: formatMXN(kpis.totalFuel),
      Icon: Fuel,
      accentColor: '#10b981',
      description: 'Combustible y rutas en el período',
      onAction: (): void => onNavigateToEgresos('FUEL'),
      actionLabel: 'Ver combustible',
    },
    {
      label: 'Seguro',
      value: formatMXN(kpis.totalInsurance),
      Icon: ShieldCheck,
      accentColor: '#3b82f6',
      description: 'Primas de seguro de la flotilla',
      onAction: (): void => onNavigateToEgresos('INSURANCE'),
      actionLabel: 'Ver seguros',
    },
    {
      label: 'Arrendamiento (flota)',
      value: formatMXN(kpis.totalLease),
      Icon: Truck,
      accentColor: '#8b5cf6',
      description: 'Compromiso mensual fijo de la flota',
      onAction: (): void => onNavigateToEgresos('LEASE'),
      actionLabel: 'Ver arrendamientos',
    },
    {
      label: 'Costo promedio / unidad',
      value: formatMXN(kpis.avgCostPerUnit),
      Icon: TrendingDown,
      accentColor: '#C12020',
      description: 'Por unidad activa en el período',
      onAction: (): void => onNavigateToEgresos(),
      actionLabel: 'Ver análisis de costos',
    },
  ];

  const donutLabels = byCategory.map(
    (c) => CATEGORY_LABELS[c.category as FinanceCategory] ?? c.category
  );
  const donutColors = byCategory.map(
    (c) => CATEGORY_COLORS[c.category as FinanceCategory] ?? '#94a3b8'
  );
  const donutTotal = byCategory.reduce((s, c) => s + c.amount, 0);

  // Mínimo visual: slices con datos pero < 2% se muestran como 2% para ser visibles
  const MIN_VISUAL_PCT = 2;
  const displaySeries = byCategory.map((c) => {
    const pct = donutTotal > 0 ? (c.amount / donutTotal) * 100 : 0;
    return pct > 0 && pct < MIN_VISUAL_PCT ? (donutTotal * MIN_VISUAL_PCT) / 100 : c.amount;
  });

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Inter, sans-serif' },
    labels: donutLabels,
    colors: donutColors,
    legend: { show: false },
    stroke: { width: 3, colors: ['#ffffff'] },
    dataLabels: {
      enabled: true,
      formatter: (
        _val: number,
        opts?: { seriesIndex: number; dataPointIndex: number; w: unknown }
      ): string => {
        const real = byCategory[opts?.seriesIndex ?? 0]?.amount ?? 0;
        const realPct = donutTotal > 0 ? (real / donutTotal) * 100 : 0;
        return realPct > 4 ? `${realPct.toFixed(1)}%` : '';
      },
      style: { fontSize: '10px', fontWeight: 700, colors: ['#ffffff'] },
      dropShadow: { enabled: false },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '58%',
          labels: {
            show: true,
            value: {
              show: true,
              fontSize: '14px',
              fontWeight: 700,
              color: '#0f2a44',
              formatter: (val: string | number): string => formatMXN(parseFloat(String(val))),
            },
            total: {
              show: true,
              label: 'Total',
              fontSize: '10px',
              fontWeight: 700,
              color: '#0f2a44',
              formatter: (): string => formatMXN(donutTotal),
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (
          _val: number,
          opts?: { seriesIndex: number; dataPointIndex: number; w: unknown }
        ): string => {
          const real = byCategory[opts?.seriesIndex ?? 0]?.amount ?? 0;
          const pct = donutTotal > 0 ? ((real / donutTotal) * 100).toFixed(2) : '0';
          return `${formatMXN(real)} (${pct}%)`;
        },
      },
    },
  };

  const CHART_WINDOWS: { label: string; months: number | null }[] = [
    { label: '15D', months: 1 },
    { label: '1M', months: 1 },
    { label: '2M', months: 2 },
    { label: '3M', months: 3 },
    { label: '6M', months: 6 },
    { label: '12M', months: 12 },
    { label: 'Todo', months: null },
  ];

  const activeChip = CHART_WINDOWS.find((w) => w.label === chartLabel) ?? CHART_WINDOWS[4];
  const chartWindowLabel =
    activeChip.label === 'Todo' ? 'Todo el período' : `Últimos ${activeChip.label}`;

  const slicedByMonth = activeChip.months ? byMonth.slice(-activeChip.months) : byMonth;
  const areaSeries = [{ name: 'Egresos', data: slicedByMonth.map((m) => m.amount) }];
  const areaCategories = slicedByMonth.map((m) => periodLabel(m.period));

  const areaOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
    colors: ['#0f2a44'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05 } },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      categories: areaCategories,
      labels: { style: { fontSize: '9px', fontWeight: 700, colors: '#0f2a44' } },
    },
    yaxis: {
      labels: {
        style: { fontSize: '9px', colors: '#0f2a44' },
        formatter: (val: number): string => formatMXN(val),
      },
    },
    tooltip: { y: { formatter: (val: number): string => formatMXN(val) } },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
    dataLabels: { enabled: false },
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Period range picker */}
      <PeriodRangePicker value={dateRange} onChange={onDateRangeChange} />

      {/* KPI Grid — patrón soberano */}
      <div className="archon-grid-sovereign">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut — by category */}
        <div className="card-archon-sovereign">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pinnacle-navy/50 mb-4">
            Distribución por categoría
          </p>
          {displaySeries.length > 0 ? (
            <>
              <ReactApexChart
                options={donutOptions}
                series={displaySeries}
                type="donut"
                height={300}
              />
              {/* Legend custom — muestra todas las categorías con monto y % */}
              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                {byCategory.map((item) => {
                  const pct =
                    donutTotal > 0 ? ((item.amount / donutTotal) * 100).toFixed(1) : '0.0';
                  const label = CATEGORY_LABELS[item.category as FinanceCategory] ?? item.category;
                  const color = CATEGORY_COLORS[item.category as FinanceCategory] ?? '#94a3b8';
                  return (
                    <div key={item.category} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] font-bold text-pinnacle-navy/70 flex-1 truncate">
                        {label}
                      </span>
                      <span className="text-[10px] font-mono font-black text-pinnacle-navy shrink-0">
                        {formatMXN(item.amount)}
                      </span>
                      <span className="text-[9px] font-bold text-pinnacle-navy/40 w-9 text-right shrink-0">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-[11px] text-pinnacle-navy/30 font-bold uppercase tracking-widest">
                Sin egresos en este período
              </p>
            </div>
          )}
        </div>

        {/* Area — monthly trend */}
        <div className="card-archon-sovereign">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pinnacle-navy/50">
              Tendencia — {chartWindowLabel}
            </p>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {CHART_WINDOWS.map((w) => (
                <button
                  key={w.label}
                  onClick={(): void => setChartLabel(w.label)}
                  className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider transition-all duration-200 border-none outline-none cursor-pointer ${
                    chartLabel === w.label
                      ? 'bg-pinnacle-navy text-white'
                      : 'bg-slate-100 text-pinnacle-navy/50 hover:bg-slate-200'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          {byMonth.length > 0 ? (
            <div className="flex-1 min-h-[200px]">
              <ReactApexChart options={areaOptions} series={areaSeries} type="area" height="100%" />
            </div>
          ) : (
            <div className="flex-1 min-h-[200px] flex items-center justify-center">
              <p className="text-[11px] text-pinnacle-navy/30 font-bold uppercase tracking-widest">
                Sin historial disponible
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Top units */}
      {topUnits.length > 0 && (
        <div className="card-archon-sovereign">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pinnacle-navy/50 mb-4">
            Top 5 unidades por costo — {periodLabel(dateRange.from)}
            {dateRange.from !== dateRange.to ? ` — ${periodLabel(dateRange.to)}` : ''}
          </p>
          <div className="space-y-2">
            {topUnits.map((u, idx) => {
              const pct = kpis.totalEgresos > 0 ? (u.amount / kpis.totalEgresos) * 100 : 0;
              return (
                <div key={u.unitId} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold text-pinnacle-navy/40 w-4">
                    {idx + 1}
                  </span>
                  <span className="text-[11px] font-black text-pinnacle-navy font-mono w-20 shrink-0">
                    {u.unitId}
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pinnacle-navy/70 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-black text-pinnacle-navy w-28 text-right shrink-0">
                    {formatMXN(u.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;

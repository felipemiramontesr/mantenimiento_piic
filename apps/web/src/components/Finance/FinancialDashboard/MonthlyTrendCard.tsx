import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { MonthlyTrend } from '../../../types/finance';
import { CHART_WINDOWS, formatMXN, periodLabel } from './helpers';

function buildAreaOptions(areaCategories: string[]): ApexOptions {
  return {
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
}

export interface MonthlyTrendCardProps {
  byMonth: MonthlyTrend[];
  chartLabel: string;
  onChartLabelChange: (label: string) => void;
}

/** Tarjeta de tendencia mensual — area chart + selector de ventana (FC163 F2B3, split). */
export const MonthlyTrendCard: React.FC<MonthlyTrendCardProps> = ({
  byMonth,
  chartLabel,
  onChartLabelChange,
}) => {
  const activeChip = CHART_WINDOWS.find((w) => w.label === chartLabel) ?? CHART_WINDOWS[4];
  const chartWindowLabel =
    activeChip.label === 'Todo' ? 'Todo el período' : `Últimos ${activeChip.label}`;

  const slicedByMonth = activeChip.months ? byMonth.slice(-activeChip.months) : byMonth;
  const areaSeries = [{ name: 'Egresos', data: slicedByMonth.map((m) => m.amount) }];
  const areaCategories = slicedByMonth.map((m) => periodLabel(m.period));
  const areaOptions = buildAreaOptions(areaCategories);

  return (
    <div className="card-archon-sovereign">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <p className="text-archon-base font-black uppercase tracking-[0.2em] text-pinnacle-navy/50">
          Tendencia — {chartWindowLabel}
        </p>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {CHART_WINDOWS.map((w) => (
            <button
              key={w.label}
              onClick={(): void => onChartLabelChange(w.label)}
              className={`px-2 py-0.5 rounded-[4px] text-archon-sm font-black uppercase tracking-wider transition-all duration-200 border-none outline-none cursor-pointer ${
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
          <p className="text-archon-md text-pinnacle-navy/30 font-bold uppercase tracking-widest">
            Sin historial disponible
          </p>
        </div>
      )}
    </div>
  );
};

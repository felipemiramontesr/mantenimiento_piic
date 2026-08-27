import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  FinanceCategory,
  CategoryBreakdown,
} from '../../../types/finance';
import { formatMXN, MIN_VISUAL_PCT } from './helpers';

type ApexDataPointOpts = { seriesIndex: number; dataPointIndex: number; w: unknown };

// Centro del donut: valor por slice al centro + total al centro (FC163 F2B3, split).
function buildDonutPlotOptions(donutTotal: number): ApexOptions['plotOptions'] {
  return {
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
            formatter: (val: string | number): string => formatMXN(Number.parseFloat(String(val))),
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
  };
}

// Etiquetas de slice (oculta las <4%) + tooltip con monto real y % (FC163 F2B3, split).
function buildDonutLabelFormatters(
  byCategory: CategoryBreakdown[],
  donutTotal: number
): Pick<ApexOptions, 'dataLabels' | 'tooltip'> {
  return {
    dataLabels: {
      enabled: true,
      formatter: (_val: number, opts?: ApexDataPointOpts): string => {
        const real = byCategory[opts?.seriesIndex ?? 0]?.amount ?? 0;
        const realPct = donutTotal > 0 ? (real / donutTotal) * 100 : 0;
        return realPct > 4 ? `${realPct.toFixed(1)}%` : '';
      },
      style: { fontSize: '10px', fontWeight: 700, colors: ['#ffffff'] },
      dropShadow: { enabled: false },
    },
    tooltip: {
      y: {
        formatter: (_val: number, opts?: ApexDataPointOpts): string => {
          const real = byCategory[opts?.seriesIndex ?? 0]?.amount ?? 0;
          const pct = donutTotal > 0 ? ((real / donutTotal) * 100).toFixed(2) : '0';
          return `${formatMXN(real)} (${pct}%)`;
        },
      },
    },
  };
}

/** Construye las opciones ApexCharts del donut de categorías (FC163 F2B3, split). */
function buildDonutOptions(byCategory: CategoryBreakdown[], donutTotal: number): ApexOptions {
  const donutLabels = byCategory.map(
    (c) => CATEGORY_LABELS[c.category as FinanceCategory] ?? c.category
  );
  const donutColors = byCategory.map(
    (c) => CATEGORY_COLORS[c.category as FinanceCategory] ?? '#94a3b8'
  );

  return {
    chart: { type: 'donut', fontFamily: 'Inter, sans-serif' },
    labels: donutLabels,
    colors: donutColors,
    legend: { show: false },
    stroke: { width: 3, colors: ['#ffffff'] },
    plotOptions: buildDonutPlotOptions(donutTotal),
    ...buildDonutLabelFormatters(byCategory, donutTotal),
  };
}

interface DonutLegendProps {
  byCategory: CategoryBreakdown[];
  donutTotal: number;
}

// Leyenda custom — muestra todas las categorías con monto y % (FC163 F2B3, split).
const DonutLegend: React.FC<DonutLegendProps> = ({ byCategory, donutTotal }) => (
  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
    {byCategory.map((item) => {
      const pct = donutTotal > 0 ? ((item.amount / donutTotal) * 100).toFixed(1) : '0.0';
      const label = CATEGORY_LABELS[item.category as FinanceCategory] ?? item.category;
      const color = CATEGORY_COLORS[item.category as FinanceCategory] ?? '#94a3b8';
      return (
        <div key={item.category} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-archon-base font-bold text-pinnacle-navy/70 flex-1 truncate">
            {label}
          </span>
          <span className="text-archon-base font-mono font-black text-pinnacle-navy shrink-0">
            {formatMXN(item.amount)}
          </span>
          <span className="text-archon-sm font-bold text-pinnacle-navy/40 w-9 text-right shrink-0">
            {pct}%
          </span>
        </div>
      );
    })}
  </div>
);

export interface CategoryDonutCardProps {
  byCategory: CategoryBreakdown[];
}

/** Tarjeta de distribución por categoría — donut + leyenda custom (FC163 F2B3, split). */
export const CategoryDonutCard: React.FC<CategoryDonutCardProps> = ({ byCategory }) => {
  const donutTotal = byCategory.reduce((s, c) => s + c.amount, 0);
  // Mínimo visual: slices con datos pero < 2% se muestran como 2% para ser visibles
  const displaySeries = byCategory.map((c) => {
    const pct = donutTotal > 0 ? (c.amount / donutTotal) * 100 : 0;
    return pct > 0 && pct < MIN_VISUAL_PCT ? (donutTotal * MIN_VISUAL_PCT) / 100 : c.amount;
  });
  const donutOptions = buildDonutOptions(byCategory, donutTotal);

  return (
    <div className="card-archon-sovereign">
      <p className="text-archon-base font-black uppercase tracking-[0.2em] text-pinnacle-navy/50 mb-4">
        Distribución por categoría
      </p>
      {displaySeries.length > 0 ? (
        <>
          <ReactApexChart options={donutOptions} series={displaySeries} type="donut" height={300} />
          <DonutLegend byCategory={byCategory} donutTotal={donutTotal} />
        </>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <p className="text-archon-md text-pinnacle-navy/30 font-bold uppercase tracking-widest">
            Sin egresos en este período
          </p>
        </div>
      )}
    </div>
  );
};

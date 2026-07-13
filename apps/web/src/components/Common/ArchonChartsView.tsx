import React from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

/**
 * 🔱 Archon Component: ArchonChartsView (FC 041 Fase D)
 * Panel de gráficos analíticos para ArchonAdaptiveView — Líneas (tendencias),
 * Dona (estatus) y Barras (comparativas).
 *
 * Reutiliza apexcharts/react-apexcharts YA existentes en apps/web (condición 2
 * del dictamen Bravo — cero dependencias nuevas). Paleta §13.3 estricta.
 * Genérico: el anfitrión provee configs; sin lógica de negocio.
 */

export type ArchonChartKind = 'LINE' | 'DONUT' | 'BAR';

export interface ArchonChartConfig {
  id: string;
  title: string;
  kind: ArchonChartKind;
  series: number[] | { name: string; data: number[] }[];
  /** Etiquetas de segmentos (DONUT). */
  labels?: string[];
  /** Categorías del eje X (LINE/BAR). */
  categories?: string[];
}

export interface ArchonChartsViewProps {
  charts: ArchonChartConfig[];
}

/** Paleta homologada §13.3 — navy, gold, sentinel, emerald, amber. */
export const ARCHON_CHART_PALETTE = ['#0f2a44', '#f2b705', '#C12020', '#10b981', '#f59e0b'];

const APEX_TYPE: Record<ArchonChartKind, 'line' | 'donut' | 'bar'> = {
  LINE: 'line',
  DONUT: 'donut',
  BAR: 'bar',
};

export function toApexType(kind: ArchonChartKind): 'line' | 'donut' | 'bar' {
  return APEX_TYPE[kind];
}

function buildOptions(config: ArchonChartConfig): ApexOptions {
  const options: ApexOptions = {
    chart: {
      type: toApexType(config.kind),
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif',
    },
    colors: ARCHON_CHART_PALETTE,
    dataLabels: { enabled: config.kind === 'DONUT' },
    legend: { position: 'bottom' },
  };
  if (config.labels !== undefined) options.labels = config.labels;
  if (config.categories !== undefined) options.xaxis = { categories: config.categories };
  return options;
}

const ArchonChartsView: React.FC<ArchonChartsViewProps> = ({ charts }) => {
  if (charts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-pinnacle-navy/40 font-display font-black text-archon-md uppercase tracking-[0.2em]">
        SIN DATOS PARA GRAFICAR
      </div>
    );
  }

  return (
    <div data-testid="archon-charts-view" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {charts.map((config) => (
        <section
          key={config.id}
          className="min-w-0 overflow-hidden bg-white border border-pinnacle-navy/10 rounded-[4px] p-4 shadow-sm"
        >
          <h3 className="font-display font-black text-archon-md text-pinnacle-navy uppercase tracking-[0.15em] mb-3">
            {config.title}
          </h3>
          <ReactApexChart
            type={toApexType(config.kind)}
            options={buildOptions(config)}
            series={config.series}
            height={280}
          />
        </section>
      ))}
    </div>
  );
};

export default ArchonChartsView;

import React from 'react';
import { ArrowRight, Truck, Layers, Wrench, Activity, History } from 'lucide-react';

interface CategoryData {
  count: number;
  availablePercent: number;
  maintenanceCount: number;
  avgMtbf: number;
  avgMttr: number;
}

interface CategoryAnalyticsCardProps {
  title: string;
  categoryKey: 'vehiculo' | 'maquinaria' | 'herramienta';
  accentColor: string;
  data: CategoryData;
  onViewDetails: (categoryKey: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  vehiculo: Truck,
  maquinaria: Layers,
  herramienta: Wrench,
};

const formatTimeMetric = (hours: number): string => {
  if (hours === 0) return '0h';
  if (hours >= 48) return `${Number((hours / 24).toFixed(1))}d`;
  return `${hours}h`;
};

const getAvailabilityDot = (percent: number): string => {
  if (percent >= 90) return 'bg-emerald-500';
  if (percent >= 75) return 'bg-amber-500 animate-pulse';
  return 'bg-red-500 animate-pulse';
};

const CategoryAnalyticsCard: React.FC<CategoryAnalyticsCardProps> = ({
  title,
  categoryKey,
  accentColor,
  data,
  onViewDetails,
}): React.JSX.Element => {
  const Icon = CATEGORY_ICONS[categoryKey];
  const dotColor = getAvailabilityDot(data.availablePercent);

  return (
    <div
      className="card-archon-sovereign animate-in fade-in duration-700"
      style={{ '--card-accent': accentColor } as React.CSSProperties}
    >
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-[4px] flex items-center justify-center border-2"
          style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }}
        >
          <Icon size={24} style={{ color: accentColor }} />
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-pinnacle-navy opacity-40">
            Segmento Operativo
          </span>
          <h3 className="text-lg font-black text-pinnacle-navy tracking-tight">{title}</h3>
        </div>
        <div className="ml-auto flex flex-col items-end">
          <span className="text-2xl font-black text-pinnacle-navy">{data.count}</span>
          <span className="text-[8px] font-black uppercase opacity-30">Activos</span>
        </div>
      </div>

      <div className="card-sovereign-quadrant-grid">
        <div className="card-sovereign-quadrant-item">
          <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">
            Disponibilidad
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-pinnacle-navy">{data.availablePercent}%</span>
            <div className={`w-2 h-2 rounded-full ${dotColor}`} />
          </div>
        </div>
        <div className="card-sovereign-quadrant-item">
          <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">
            Estado Crítico
          </span>
          <span className="text-xl font-black text-red-500">{data.maintenanceCount}</span>
        </div>
        <div className="card-sovereign-quadrant-item">
          <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">
            MTBF Promedio
          </span>
          <div className="flex items-center gap-1">
            <Activity size={10} className="text-sky-500" />
            <span className="text-base font-black text-pinnacle-navy">
              {formatTimeMetric(data.avgMtbf)}
            </span>
          </div>
        </div>
        <div className="card-sovereign-quadrant-item">
          <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">
            MTTR Táctico
          </span>
          <div className="flex items-center gap-1">
            <History size={10} className="text-amber-500" />
            <span className="text-base font-black text-pinnacle-navy">
              {formatTimeMetric(data.avgMttr)}
            </span>
          </div>
        </div>
      </div>

      <button onClick={(): void => onViewDetails(categoryKey)} className="btn-archon-card-action">
        VER DETALLES <ArrowRight size={12} className="ml-2" />
      </button>
    </div>
  );
};

export default CategoryAnalyticsCard;

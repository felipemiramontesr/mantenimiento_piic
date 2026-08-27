import React from 'react';

/** Skeleton de carga del dashboard financiero (FC163 F2B3, split de FinancialDashboard). */
export const DashboardLoadingSkeleton: React.FC = () => (
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

export interface DashboardErrorViewProps {
  error: string | null;
}

/** Estado de error/sin-datos del dashboard financiero (FC163 F2B3, split de FinancialDashboard). */
export const DashboardErrorView: React.FC<DashboardErrorViewProps> = ({ error }) => (
  <div className="card-archon-sovereign flex items-center justify-center h-48">
    <p className="text-archon-label font-bold text-sentinel-red uppercase tracking-widest">
      {error ?? 'Sin datos'}
    </p>
  </div>
);

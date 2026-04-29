import React from 'react';
import { Wallet, TrendingUp, BarChart3, ArrowUpRight, Activity } from 'lucide-react';

/**
 * 🔱 Archon Module: Financial Health
 * Implementation: Sovereign Financial Intelligence Placeholder
 * v.1.0.0 - Premium Visual Skeleton
 */
const FinancialHealthModule: React.FC = () => (
  <div className="space-y-8 animate-in fade-in duration-700">
    {/* HEADER SECTION */}
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-[#f2b705] rounded-full animate-pulse" />
          <span className="text-[11px] font-black text-[#0f2a44] uppercase tracking-[0.2em] opacity-60">
            Módulo de Inteligencia
          </span>
        </div>
        <h1 className="text-4xl font-black text-[#0f2a44] tracking-tighter">
          Salud <span className="text-[#f2b705]">Financiera</span>
        </h1>
        <p className="text-slate-500 mt-2 max-w-xl text-sm leading-relaxed">
          Monitoreo en tiempo real de flujos de capital, costos operativos y proyecciones de
          inversión de activos.
        </p>
      </div>

      <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
        <div className="px-4 py-2 text-right">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Balance Mensual
          </span>
          <span className="text-xl font-black text-[#0f2a44] tracking-tighter">$---,---.--</span>
        </div>
        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
          <Activity size={20} />
        </div>
      </div>
    </div>

    {/* KPI GRID */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        {
          label: 'Costo por Kilómetro',
          icon: <TrendingUp size={20} />,
          color: 'text-blue-500',
          bg: 'bg-blue-50',
        },
        {
          label: 'Eficiencia de Combustible',
          icon: <BarChart3 size={20} />,
          color: 'text-[#f2b705]',
          bg: 'bg-amber-50',
        },
        {
          label: 'Presupuesto de Mantenimiento',
          icon: <Wallet size={20} />,
          color: 'text-emerald-500',
          bg: 'bg-emerald-50',
        },
      ].map((kpi, idx) => (
        <div
          key={idx}
          className="glass-card-pro bg-white p-6 relative overflow-hidden group hover:translate-y-[-4px] transition-all duration-500"
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`${kpi.bg} ${kpi.color} p-3 rounded-xl`}>{kpi.icon}</div>
            <div className="flex items-center gap-1 text-emerald-500 font-bold text-xs">
              <ArrowUpRight size={14} />
              <span>+0.0%</span>
            </div>
          </div>
          <span className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
            {kpi.label}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0f2a44] tracking-tighter">---.--</span>
            <span className="text-xs font-bold text-slate-400 uppercase">MXN</span>
          </div>

          {/* SKELETON DECORATION */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-50 overflow-hidden">
            <div className="h-full bg-slate-200 w-1/3 animate-shimmer" />
          </div>
        </div>
      ))}
    </div>

    {/* ANALYTICS PLACEHOLDER */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="glass-card-pro bg-[#0f2a44] p-8 text-white min-h-[400px] flex flex-col justify-center items-center text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        </div>
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <BarChart3 size={32} className="text-[#f2b705]" />
        </div>
        <h3 className="text-2xl font-black tracking-tighter mb-4">Motor de Proyecciones</h3>
        <p className="text-white/60 text-sm max-w-xs leading-relaxed italic">
          &quot;La inteligencia financiera de Archon está procesando modelos de datos históricos
          para habilitar proyecciones predictivas.&quot;
        </p>
        <div className="mt-8 flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-2 h-8 bg-white/20 rounded-full animate-shimmer"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>

      <div className="glass-card-pro bg-white p-8 border border-dashed border-slate-200 flex flex-col justify-center items-center text-center">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
          <TrendingUp size={24} />
        </div>
        <span className="text-[10px] font-black text-[#0f2a44] uppercase tracking-[0.3em] opacity-30">
          Área Reservada
        </span>
        <div className="space-y-3 mt-6 w-full max-w-xs">
          <div className="h-4 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-4 bg-slate-100 rounded-full animate-pulse w-3/4 mx-auto" />
          <div className="h-4 bg-slate-100 rounded-full animate-pulse w-1/2 mx-auto" />
        </div>
        <button className="mt-8 px-6 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg opacity-40 cursor-not-allowed">
          Conectar ERP
        </button>
      </div>
    </div>
  </div>
);

export default FinancialHealthModule;

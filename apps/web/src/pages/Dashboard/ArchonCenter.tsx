import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { ShieldAlert, Activity, Zap, Bell, Server } from 'lucide-react';

const ArchonCenter: React.FC = () => {
  // Configuración de Salud Global (Radial)
  const healthOptions: ApexOptions = {
    chart: { type: 'radialBar', sparkline: { enabled: true } },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        track: { background: "rgba(15, 42, 68, 0.05)", strokeWidth: '97%', margin: 5 },
        dataLabels: {
          name: { show: false },
          value: { offsetY: -2, fontSize: '20px', fontWeight: 900, color: '#0f2a44' }
        }
      }
    },
    colors: ['#f2b705'],
    stroke: { lineCap: 'butt' },
    labels: ['Salud'],
  };

  // Configuración de Monitor de Pulso (Area)
  const pulseOptions: ApexOptions = {
    chart: { 
      type: 'area', 
      toolbar: { show: false },
      sparkline: { enabled: false },
      animations: { enabled: true, dynamicAnimation: { speed: 1000 } }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2, colors: ['#0f2a44'] },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.15, opacityTo: 0, stops: [0, 90, 100] }
    },
    xaxis: { 
      type: 'datetime',
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: { show: false },
    grid: { show: false },
    tooltip: { theme: 'light', x: { show: false } }
  };

  const pulseSeries = [{
    name: 'Rendimiento',
    data: Array.from({ length: 20 }, (_, i) => ({
      x: new Date().getTime() - (20 - i) * 60000,
      y: Math.floor(Math.random() * 100)
    }))
  }];

  return (
    <div 
      style={{ 
        backgroundColor: '#ffffff', 
        minHeight: '100vh', 
        width: '100%', 
        padding: '40px 60px',
        color: '#0f2a44',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
      className="workspace-pro animate-in fade-in duration-700"
    >
      {/* Header ArchonCore V.4.1.0 */}
      <header className="mb-48">
        <div className="flex items-center gap-12 mb-8">
          <span className="w-8 h-[2px] bg-[#f2b705]" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#0f2a44]/30">ArchonCore v.4.1.0</p>
        </div>
        <div className="flex justify-between items-end border-b border-slate-100 pb-24">
          <div>
            <h2 className="text-[#0f2a44] tracking-tighter font-black text-4xl mb-2">Centro de <span className="font-light opacity-40">Comando</span></h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-tight">Telemetría de Flota y Flujo de Inteligencia Sentinel</p>
          </div>
          <div className="flex items-center gap-24">
            <div className="text-right">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 block">Estado del Sistema</span>
              <div className="flex items-center gap-8">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[#0f2a44] font-black text-xs uppercase">Sincronización Nominal</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Grid Táctico de 3 Columnas (KPI Glassmorphism Blindado) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '24px', 
          marginBottom: '32px' 
        }}
      >
        
        {/* KPI 1: Salud de Flota (Panel Centralizado) */}
        <div className="glass-card-pro p-24">
          <div className="flex justify-between items-start mb-8 border-b border-slate-100/50 pb-12">
            <div className="flex items-center gap-8">
              <Zap size={12} className="text-[#f2b705]" />
              <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0f2a44]/60">Salud Operativa</h4>
            </div>
            <span className="text-[8px] font-bold text-slate-300">NODO_ALPHA</span>
          </div>
          <div className="flex flex-col items-center justify-center flex-1">
            <Chart options={healthOptions} series={[92]} type="radialBar" height={160} width="100%" />
            <p className="text-[10px] font-black text-[#0f2a44] uppercase tracking-widest -mt-12">Unidades Activas</p>
          </div>
        </div>

        {/* KPI 2: Estado de Red (Panel de Latencia) */}
        <div className="glass-card-pro p-24">
          <div className="flex justify-between items-start mb-24 border-b border-slate-100/50 pb-12">
            <div className="flex items-center gap-8">
              <Server size={12} className="text-[#0f2a44]" />
              <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0f2a44]/60">Rendimiento Core</h4>
            </div>
            <span className="text-[8px] font-bold text-slate-300">LATENCY_MS</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-4xl font-black text-[#0f2a44] mb-4">42<span className="text-sm ml-4 opacity-30">ms</span></h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-16">Latencia de Respuesta Sentinel</p>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#0f2a44] w-[65%] transition-all duration-1000" />
            </div>
          </div>
        </div>

        {/* KPI 3: Alertas Críticas (Panel de Alarma) */}
        <div className="glass-card-pro p-24" style={{ borderColor: 'rgba(242, 183, 5, 0.3)' }}>
          <div className="flex justify-between items-start mb-24 border-b border-slate-100/50 pb-12">
            <div className="flex items-center gap-8">
              <Bell size={12} className="text-[#f2b705]" />
              <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f2b705]">Alertas de Sistema</h4>
            </div>
            <span className="text-[8px] font-bold text-[#f2b705]/50">CRITICAL_COUNT</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-4xl font-black text-[#f2b705] mb-4">07</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-16">Unidades en Mantenimiento Táctico</p>
            <button className="text-[9px] font-black uppercase text-[#0f2a44] underline text-left hover:text-[#f2b705] transition-colors">
              Explorar Diagnósticos de Alarma
            </button>
          </div>
        </div>

      </div>

      {/* Monitor de Pulso Central */}
      <div className="glass-card-pro p-32 mb-32">
        <div className="flex justify-between items-center mb-24">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0f2a44] flex items-center gap-12">
            <Activity size={14} className="text-[#f2b705]" /> Monitor de Rendimiento Táctico
          </h4>
          <div className="flex gap-16">
            <span className="text-[9px] font-bold text-slate-300">ACTUALIZACIÓN_AUTO</span>
            <span className="text-[9px] font-bold text-[#f2b705] animate-pulse">LIVE</span>
          </div>
        </div>
        <Chart options={pulseOptions} series={pulseSeries} type="area" height={220} />
      </div>

      {/* Tabla de Logs de Inteligencia Sentinel */}
      <div className="p-32 border border-slate-100 rounded-lg">
        <div className="flex items-center gap-12 mb-24">
          <div className="p-8 bg-[#0f2a44]/5 rounded-sm">
            <ShieldAlert size={14} className="text-[#0f2a44]" />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]">Logs de Inteligencia Sentinel</h4>
            <p className="text-[9px] text-slate-400 font-bold uppercase">Auditoría de Acceso a Nodos Encriptados</p>
          </div>
        </div>

        <table className="table-sentinel">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Evento Táctico</th>
              <th>Nodo de Origen</th>
              <th>Estado de Seguridad</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td>{new Date().toLocaleTimeString([], { hour12: false })}</td>
                <td><span className="font-black text-[#0f2a44]">NODE_AUTH_SUCCESS</span></td>
                <td>X-CLUSTER-ALPHA-{i}</td>
                <td className="flex items-center gap-8">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#0f2a44]/40">Verificado</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ArchonCenter;

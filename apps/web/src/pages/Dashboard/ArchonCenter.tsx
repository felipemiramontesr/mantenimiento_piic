import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { ShieldAlert, Activity, Zap, Bell, Server, ArrowRight } from 'lucide-react';

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
      {/* Header ArchonCore V.4.3.0 */}
      <header className="mb-48">
        <div className="flex items-center gap-12 mb-8">
          <span className="w-8 h-[2px] bg-[#f2b705]" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#0f2a44]/30">ArchonCore Heritage v.4.3.0</p>
        </div>
        <div className="flex justify-between items-end border-b border-slate-100 pb-24">
          <div>
            <h2 className="text-[#0f2a44] tracking-tighter font-black text-4xl mb-2">Centro de <span className="font-light opacity-30">Comando</span></h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.1em]">Telemetría de Flota y Flujo de Inteligencia Sentinel</p>
          </div>
          <div className="flex items-center gap-32">
            <div className="text-right">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mb-4">Estado del Sistema</span>
              <div className="flex items-center gap-8 justify-end">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[#0f2a44] font-black text-[11px] uppercase tracking-tight">Sincronización Nominal</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Grid Táctico Silicon Valley (3 Columnas) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '24px', 
          marginBottom: '32px' 
        }}
      >
        
        {/* KPI 1: Salud Operativa (Decorado Azul / Botón Amarillo) */}
        <div className="glass-card-pro p-32">
          <div className="flex justify-between items-center mb-24 border-b border-slate-100/50 pb-16">
            <div className="flex items-center gap-10">
              <Zap size={14} className="text-[#0f2a44]" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0f2a44]">Salud Operativa</h4>
            </div>
            <span className="text-[9px] font-bold text-[#0f2a44]/20 text-technical-mono tracking-tighter">NODO_ALPHA_01</span>
          </div>
          <div className="flex flex-col items-center justify-center flex-1">
            <Chart options={healthOptions} series={[92]} type="radialBar" height={160} width="100%" />
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest -mt-12 mb-24">Unidades en Activo</p>
            <button className="btn-sentinel-yellow w-full">
              Diagnóstico de Flota <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* KPI 2: Rendimiento Core (Decorado Azul) */}
        <div className="glass-card-pro p-32">
          <div className="flex justify-between items-center mb-24 border-b border-slate-100/50 pb-16">
            <div className="flex items-center gap-10">
              <Server size={14} className="text-[#0f2a44]" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#0f2a44]">Rendimiento Core</h4>
            </div>
            <span className="text-[9px] font-bold text-[#0f2a44]/20 text-technical-mono tracking-tighter">LATENCY_MS_SYNC</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-24 px-8 border-l-4 border-[#0f2a44]">
              <h3 className="text-4xl font-black text-[#0f2a44] tracking-tighter">42.8<span className="text-sm ml-4 font-bold opacity-30">ms</span></h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Latencia de Respuesta Sentinel</p>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-24">
              <div className="h-full bg-[#0f2a44] w-[65%] transition-all duration-1000" />
            </div>
            <button className="btn-sentinel-yellow w-full">
              Optimizar Nodo Core <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* KPI 3: Incidentes (Decorado Alerta Amarillo / Botón Amarillo) */}
        <div className="glass-card-pro p-32" style={{ borderTop: '4px solid #f2b705' }}>
          <div className="flex justify-between items-center mb-24 border-b border-slate-100/50 pb-16">
            <div className="flex items-center gap-10">
              <Bell size={14} className="text-[#f2b705]" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#f2b705]">Estado de Alertas</h4>
            </div>
            <span className="text-[9px] font-bold text-[#f2b705]/40 text-technical-mono tracking-tighter">LIVE_INCIDENT_FEED</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-24 px-8">
              <h3 className="text-4xl font-black text-[#f2b705] tracking-tighter">07</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Unidades en Mantenimiento Táctico</p>
            </div>
            <div className="flex gap-8 mb-24">
              <div className="h-2 w-8 bg-[#f2b705] rounded-sm" />
              <div className="h-2 w-8 bg-[#f2b705] rounded-sm" />
              <div className="h-2 w-8 bg-[#f2b705]/20 rounded-sm" />
            </div>
            <button className="btn-sentinel-yellow w-full">
              Ver Protocolos de Alarma <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* Monitor de Pulso Heritage (Refinado) */}
      <div className="glass-card-pro p-32 mb-32 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#0f2a44]" />
        <div className="flex justify-between items-center mb-32">
          <div className="flex items-center gap-12">
            <div className="p-10 bg-[#0f2a44]/5 rounded-sm">
              <Activity size={16} className="text-[#0f2a44]" />
            </div>
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0f2a44]">Monitor de Rendimiento Táctico</h4>
              <p className="text-[9px] font-bold text-slate-300 uppercase">Flujo de Telemetría RAW en Tiempo Real</p>
            </div>
          </div>
          <div className="flex gap-16 items-center">
            <span className="text-[9px] font-black text-[#0f2a44]/20 tracking-[0.3em]">NOMINAL_PULSE_SYNC</span>
            <div className="flex items-center gap-8 py-4 px-12 bg-[#f2b705]/10 rounded-full border border-[#f2b705]/20">
              <div className="w-1.5 h-1.5 bg-[#f2b705] rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-[#f2b705] uppercase">Live</span>
            </div>
          </div>
        </div>
        <Chart options={pulseOptions} series={pulseSeries} type="area" height={240} />
      </div>

      {/* Tabla de Logs de Inteligencia Sentinel (Industrial Grade) */}
      <div className="p-32 border border-slate-100/60 rounded-lg bg-[#f8fafc]/30">
        <div className="flex items-center justify-between mb-32 pb-16 border-b border-slate-200/50">
          <div className="flex items-center gap-12">
            <div className="p-10 bg-[#0f2a44] rounded-sm">
              <ShieldAlert size={16} className="text-white" />
            </div>
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-[#0f2a44]">Auditoría de Inteligencia Sentinel</h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Registros de Acceso Encriptados y Verificados por ArchonCore</p>
            </div>
          </div>
          <button className="text-[10px] font-bold text-[#0f2a44] uppercase tracking-widest hover:underline">Ver Historial Completo</button>
        </div>

        <table className="table-sentinel">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Entidad / Acción Táctica</th>
              <th>Nodo de Origen CORE</th>
              <th>Estado Sentinel</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td className="text-technical-mono opacity-50">{new Date().toLocaleTimeString([], { hour12: false })}.4{i}2</td>
                <td><span className="font-black text-[#0f2a44]">AUTH_ACCESS_GRANTED</span> <span className="text-[9px] opacity-40 ml-4">#XQ-{i}89</span></td>
                <td className="text-technical-mono">X-CLUSTER-ALPHA-{i}</td>
                <td>
                  <div className="flex items-center gap-10">
                    <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]/60">Verificado</span>
                  </div>
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

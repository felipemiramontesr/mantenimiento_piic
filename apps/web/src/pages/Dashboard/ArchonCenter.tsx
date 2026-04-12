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

      {/* Grid Táctico de 3 Columnas (KPI Glassmorphism) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-24 mb-32">
        
        {/* KPI 1: Salud de Flota */}
        <div className="glass-card-pro p-24 flex flex-col items-center">
          <div className="w-full flex justify-between items-start mb-16">
            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0f2a44]/40">Salud de Flota</h4>
            <Zap size={14} className="text-[#f2b705]" />
          </div>
          <Chart options={healthOptions} series={[92]} type="radialBar" height={160} width="100%" />
          <p className="text-[10px] font-black text-[#0f2a44] uppercase mt-8">Unidades Activas</p>
        </div>

        {/* KPI 2: Estado de Red */}
        <div className="glass-card-pro p-24 flex flex-col justify-between">
          <div className="w-full flex justify-between items-start">
            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0f2a44]/40">Carga del Sistema</h4>
            <Server size={14} className="text-[#0f2a44]" />
          </div>
          <div className="my-16">
            <h3 className="text-3xl font-black text-[#0f2a44]">42<span className="text-xs ml-4 opacity-30">ms</span></h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase">Latencia de Nodo Core</p>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0f2a44] w-[65%]" />
          </div>
        </div>

        {/* KPI 3: Alertas Activas */}
        <div className="glass-card-pro p-24 flex flex-col justify-between border-l-4 border-[#f2b705]">
          <div className="w-full flex justify-between items-start">
            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f2b705]">Alertas Críticas</h4>
            <Bell size={14} className="text-[#f2b705]" />
          </div>
          <div className="my-16">
            <h3 className="text-3xl font-black text-[#f2b705]">07</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase">Unidades en Mantenimiento</p>
          </div>
          <button className="text-[9px] font-black uppercase text-[#0f2a44] underline text-left hover:text-[#f2b705] transition-colors">Ver Detalles de Alarma</button>
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

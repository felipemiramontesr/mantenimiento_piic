import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { ShieldAlert, Activity, Zap, Bell, Server, ArrowRight, LayoutDashboard } from 'lucide-react';

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
    <main className="workspace-container-pro animate-in fade-in duration-700">
      
      {/* 🚀 HEADER SOBERANO (10vh) */}
      <header className="workspace-header-pro">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-12 mb-4">
            <LayoutDashboard size={14} className="text-[#f2b705]" />
            <h2 className="text-navy-main tracking-tighter font-black text-2xl">
              Centro de <span className="font-light opacity-30">Comando</span>
            </h2>
          </div>
          <p className="text-navy-muted text-[10px] font-bold uppercase tracking-[0.2em]">
            Eje de Control de Flota & Telemetría Táctica de Inteligencia
          </p>
        </div>
      </header>

      {/* 📊 BODY SCROLLEABLE (80vh) */}
      <section className="workspace-body-pro">
        
        {/* Grid Soberano (Simetría Axial de 3 Columnas) */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '24px', 
            marginBottom: '32px' 
          }}
        >
          
          {/* KPI 1: Salud Operativa */}
          <div className="glass-card-pro text-center">
            <div className="flex flex-col items-center mb-24">
              <div className="p-12 rounded-full border border-[#f2b705]/20 mb-12">
                <Zap size={16} className="text-[#f2b705]" />
              </div>
              <div className="flex items-center gap-8">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f2b705]" />
                <h4 className="text-instrument-header text-navy-main">Salud Operativa</h4>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="mb-8">
                <Chart options={healthOptions} series={[92]} type="radialBar" height={160} width="100%" />
              </div>
              <div className="flex items-center gap-8 mb-32 -mt-4">
                <span className="text-technical-mono text-navy-dim">ID_NODO:</span>
                <span className="text-technical-mono text-navy-main font-bold">ALPHA_01</span>
              </div>
            </div>

            <div className="mt-auto">
              <p className="text-[10px] font-black text-navy-muted uppercase mb-16 tracking-widest">Unidades Activas en Servicio</p>
              <button className="btn-sentinel-yellow w-full">
                Diagnóstico de Flota <ArrowRight size={14} className="text-navy-main" />
              </button>
            </div>
          </div>

          {/* KPI 2: Rendimiento Core */}
          <div className="glass-card-pro text-center">
            <div className="flex flex-col items-center mb-24">
              <div className="p-12 rounded-full border border-[#f2b705]/20 mb-12">
                <Server size={16} className="text-[#f2b705]" />
              </div>
              <div className="flex items-center gap-8">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f2b705]" />
                <h4 className="text-instrument-header text-navy-main">Rendimiento Core</h4>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="mb-16">
                <h3 className="text-kpi-black text-navy-main">42.8<span className="text-xl ml-4 opacity-20 text-navy-main">ms</span></h3>
                <p className="text-[11px] font-bold text-navy-muted uppercase tracking-tight mt-4">Latencia de Respuesta Sentinel</p>
              </div>
              <div className="w-32 h-1 bg-slate-100 rounded-full overflow-hidden mb-16">
                <div className="h-full bg-navy-main w-[65%]" />
              </div>
              <div className="flex items-center gap-8 mb-24">
                <span className="text-technical-mono text-navy-dim">LOG:</span>
                <span className="text-technical-mono text-navy-main font-bold">SYNK_012</span>
              </div>
            </div>

            <div className="mt-auto">
              <button className="btn-sentinel-yellow w-full">
                Optimizar Nodo <ArrowRight size={14} className="text-navy-main" />
              </button>
            </div>
          </div>

          {/* KPI 3: Incidentes */}
          <div className="glass-card-pro text-center" style={{ borderTop: '4px solid #f2b705' }}>
            <div className="flex flex-col items-center mb-24">
              <div className="p-12 rounded-full border border-[#f2b705]/20 mb-12">
                <Bell size={16} className="text-[#f2b705]" />
              </div>
              <div className="flex items-center gap-8">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f2b705]" />
                <h4 className="text-instrument-header text-[#0f2a44]">Alertas activas</h4>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="mb-16">
                <h3 className="text-kpi-black text-[#f2b705]">07</h3>
                <p className="text-[11px] font-bold text-navy-muted uppercase tracking-tight mt-4">Incidentes en Mantenimiento Táctico</p>
              </div>
              <div className="flex gap-4 justify-center mb-24">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f2b705]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#f2b705]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#f2b705]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#f2b705]/20" />
              </div>
            </div>

            <div className="mt-auto">
              <button className="btn-sentinel-yellow w-full">
                Ver Protocolos <ArrowRight size={14} className="text-navy-main" />
              </button>
            </div>
          </div>

        </div>

        {/* Monitor de Pulso Soberano */}
        <div className="glass-card-pro p-40 mb-32 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f2b705]" />
          <div className="flex justify-between items-center mb-32">
            <div className="flex items-center gap-16">
              <div className="p-12 bg-navy-main rounded-sm">
                <Activity size={18} className="text-[#f2b705]" />
              </div>
              <div>
                <h4 className="text-[12px] font-black uppercase tracking-[0.25em] text-navy-main">Monitor de Rendimiento Táctico</h4>
                <p className="text-[10px] font-bold text-navy-dim uppercase tracking-widest">Telemetría RAW de Nodo Centralizado v.4.5</p>
              </div>
            </div>
            <div className="flex gap-16 items-center">
              <span className="text-[10px] font-black text-navy-dim tracking-[0.3em]">NOMINAL_PULSE_SYNC</span>
              <div className="flex items-center gap-8 py-6 px-16 bg-[#f2b705]/10 rounded-full border border-[#f2b705]/20">
                <div className="w-2 h-2 bg-[#f2b705] rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-[#f2b705] uppercase">Live</span>
              </div>
            </div>
          </div>
          <Chart options={pulseOptions} series={pulseSeries} type="area" height={240} />
        </div>

        {/* Tabla de Logs de Inteligencia Sentinel (Sovereign Grade) */}
        <div className="p-40 border border-slate-100 rounded-lg bg-[#f8fafc]/40">
          <div className="flex items-center justify-between mb-40 pb-20 border-b border-slate-200/50">
            <div className="flex items-center gap-16">
              <div className="p-12 bg-navy-main rounded-sm">
                <ShieldAlert size={18} className="text-[#f2b705]" />
              </div>
              <div>
                <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-navy-main">Auditoría de Acceso Sentinel</h4>
                <p className="text-[10px] text-navy-muted font-bold uppercase tracking-tighter">Registros de Seguridad y Verificación de Nodos Encriptados</p>
              </div>
            </div>
            <button className="text-[11px] font-black text-navy-main uppercase tracking-widest hover:underline transition-all">Ver Registro Completo</button>
          </div>

          <table className="table-sentinel">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Entidad / Acción Táctica</th>
                <th>Nodo de Origen CORE</th>
                <th>Resultado Sentinel</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td className="text-technical-mono text-navy-dim">{new Date().toLocaleTimeString([], { hour12: false })}.2{i}1</td>
                  <td><span className="font-black text-navy-main uppercase">AUTH_TOKEN_VERIFIED</span> <span className="text-[9px] text-navy-dim ml-8 tracking-widest">#SENT-XQ-{i}</span></td>
                  <td className="text-technical-mono text-navy-muted tracking-tight">X-CLUSTER-ALPHA-{i}</td>
                  <td>
                    <div className="flex items-center gap-12">
                      <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.4)]" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-navy-muted/60">Verificado</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ⚓ FOOTER SENTINEL (10vh) */}
      <footer className="workspace-footer-pro">
        <p>Todos los derechos reservados ArchonCore</p>
        <p className="text-navy-main">ArchonCore Sovereign v.4.5.0</p>
      </footer>
    </main>
  );
};

export default ArchonCenter;

import React from 'react';
import Chart from 'react-apexcharts';
import { ShieldAlert, Activity, Truck, Zap } from 'lucide-react';

const ArchonCenter: React.FC = () => {
  // Configuración de Health Gauge (Estado de Flota)
  const healthOptions: ApexCharts.ApexOptions = {
    chart: { type: 'radialBar', sparkline: { enabled: true } },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        track: { background: "#f1f5f9", strokeWidth: '97%', margin: 5 },
        dataLabels: {
          name: { show: false },
          value: { offsetY: -2, fontSize: '22px', fontWeight: 900, color: '#0f2a44' }
        }
      }
    },
    colors: ['#f2b705'],
    fill: { type: 'solid' },
    stroke: { lineCap: 'butt' },
    labels: ['Health'],
  };

  // Configuración de Activity Pulse (Evento / Tiempo)
  const pulseOptions: ApexCharts.ApexOptions = {
    chart: { 
      type: 'area', 
      toolbar: { show: false },
      sparkline: { enabled: false },
      animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2, colors: ['#0f2a44'] },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.1, opacityTo: 0, stops: [0, 90, 100] }
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
    name: 'Throughput',
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
      {/* Header Sentinel V.4.0 */}
      <header className="mb-48">
        <div className="flex items-center gap-12 mb-8">
          <span className="w-8 h-[2px] bg-[#f2b705]" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#0f2a44]/20">Sentinel Nexus v4.0.0</p>
        </div>
        <div className="flex justify-between items-end border-b border-slate-100 pb-24">
          <div>
            <h2 className="text-[#0f2a44] tracking-tighter font-black text-4xl mb-2">Command <span className="font-light opacity-40">Center</span></h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-tight">Active Fleet Telemetry & Intelligence Feed</p>
          </div>
          <div className="flex items-center gap-24">
            <div className="text-right">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 block">System Pulse</span>
              <div className="flex items-center gap-8">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[#0f2a44] font-black text-xs">NOMINAL_SYNC</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Telemetry Grid */}
      <div className="grid grid-cols-12 gap-24 mb-24">
        
        {/* Unit Alpha: Overall Health Gauge */}
        <div className="col-span-12 md:col-span-4 p-32 bg-slate-50 border border-slate-100/50 rounded-sm relative overflow-hidden group">
          <div className="relative z-10">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-24 flex items-center gap-8">
              <Zap size={12} className="text-[#f2b705]" /> Fleet Health Index
            </h4>
            <div className="flex justify-center -mb-24">
              <Chart options={healthOptions} series={[84]} type="radialBar" height={240} />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Operational Units</p>
            </div>
          </div>
        </div>

        {/* Unit Beta: Activity Pulse monitor */}
        <div className="col-span-12 md:col-span-8 p-32 bg-slate-50 border border-slate-100/50 rounded-sm">
          <div className="flex justify-between items-center mb-24">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] flex items-center gap-8">
              <Activity size={12} className="text-[#0f2a44]" /> Throughput Pulse
            </h4>
            <span className="text-[10px] font-bold text-slate-400">REALTIME_LOG_SYNC</span>
          </div>
          <Chart options={pulseOptions} series={pulseSeries} type="area" height={180} />
        </div>

      </div>

      {/* Tertiary Metrics & Intelligence Feed */}
      <div className="grid grid-cols-12 gap-24">
        
        {/* Fleet Distribution Summary */}
        <div className="col-span-4 grid grid-cols-1 gap-12">
          <div className="p-20 border border-slate-100 rounded-sm flex items-center justify-between">
            <div className="flex items-center gap-12">
              <Truck size={16} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase text-slate-400">Active Fleet</span>
            </div>
            <span className="text-xl font-black text-[#0f2a44]">842</span>
          </div>
          <div className="p-20 border border-slate-100 rounded-sm bg-[#f2b705]/5 flex items-center justify-between">
            <div className="flex items-center gap-12">
              <ShieldAlert size={16} className="text-[#f2b705]" />
              <span className="text-[10px] font-black uppercase text-[#f2b705]">Maintenace Alert</span>
            </div>
            <span className="text-xl font-black text-[#f2b705]">12</span>
          </div>
        </div>

        {/* Intelligence feed (Compact) */}
        <div className="col-span-8 p-24 bg-white border border-slate-100 rounded-sm">
          <div className="flex justify-between items-center mb-16 pb-8 border-b border-slate-50">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-[#0f2a44]">Intelligence Feed</h4>
            <span className="text-[9px] font-bold text-slate-300">AUTO_AUDIT_ON</span>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center py-8 text-[11px] border-b border-transparent hover:border-[#f2b705]/20 transition-all">
                <div className="flex items-center gap-16">
                  <span className="text-slate-300 font-mono">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                  <span className="font-bold text-[#0f2a44]/70 tracking-tight">SEC_EVENT: <span className="text-[#0f2a44] font-black">NODE_AUTH_PASS_01{i}</span></span>
                </div>
                <div className="flex items-center gap-8">
                  <div className="w-1 h-1 bg-green-500 rounded-full" />
                  <span className="text-[8px] font-black text-slate-300 uppercase underline">Verified</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ArchonCenter;

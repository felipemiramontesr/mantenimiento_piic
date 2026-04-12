import React from 'react';
import { Settings, ShieldAlert } from 'lucide-react';



interface TelemetryWidgetProps {
  label: string;
  value: string;
  trend: string;
}

const TelemetryWidget: React.FC<TelemetryWidgetProps> = ({ label, value, trend }) => (
  <div className="card-pro p-24 transition-all duration-300">
    <div className="flex justify-between items-start mb-12">
      <p className="text-[10px] uppercase tracking-[0.2em] text-pinnacle-navy/40 font-bold">{label}</p>
      <div className="w-4 h-[1px] bg-pinnacle-accent" />
    </div>
    <div className="flex items-baseline gap-12">
      <h3 className="text-4xl font-black text-pinnacle-navy tracking-tight">{value}</h3>
      <span className={`text-[10px] font-bold uppercase tracking-widest px-8 py-2 rounded-full ${
        trend === 'Online' || trend.startsWith('+') 
          ? 'bg-green-100 text-green-700' 
          : 'bg-yellow-100 text-yellow-700'
      }`}>
        {trend}
      </span>
    </div>
    <div className="mt-16 h-[2px] w-full bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full bg-pinnacle-navy/10 w-[45%]" />
    </div>
  </div>
);

const ArchonCenter: React.FC = () => (
    <div 
      style={{ 
        backgroundColor: '#ffffff', 
        minHeight: '100vh', 
        width: '100%', 
        padding: '48px 80px',
        color: '#0f2a44'
      }}
      className="workspace-pro animate-in fade-in duration-500"
    >
      <header className="mb-64">
        <div className="flex items-center gap-12 mb-12">
          <span className="w-12 h-1 bg-pinnacle-accent" />
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-pinnacle-navy/30">Operations Terminal v2.4</p>
        </div>
        <div className="flex justify-between items-end border-b border-slate-100 pb-32">
          <div>
            <h2 className="text-pinnacle-navy tracking-tighter font-black text-5xl mb-2">Operational <span className="text-pinnacle-navy/40 font-light">Insight</span></h2>
            <p className="text-slate-400 text-sm font-medium">Real-time system telemetry and authorization logs</p>
          </div>
          <div className="flex items-center gap-16">
            <button className="btn-blue-pro shadow-lg">Refresh Sync</button>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">System Status</span>
              <span className="text-pinnacle-navy font-bold text-xs uppercase">100% Nominal</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-24">
        <TelemetryWidget label="Cloud Infrastructure" value="99.9" trend="+0.01" />
        <TelemetryWidget label="Active Fleet Units" value="842" trend="Sync" />
        <TelemetryWidget label="Core Security" value="v2.4" trend="Secure" />
      </div>

      <div className="mt-32 card-pro p-40 relative group">
        <div className="absolute top-0 right-0 p-24 opacity-5">
          <Settings className="w-32 h-32 text-pinnacle-navy" />
        </div>
        
        <div className="flex items-center justify-between mb-40 pb-20 border-b border-slate-50">
          <div className="flex items-center gap-16">
            <div className="p-10 bg-pinnacle-accent/10 rounded-sm">
              <ShieldAlert className="w-16 h-16 text-pinnacle-accent" />
            </div>
            <div>
              <h3 className="text-pinnacle-navy tracking-widest font-black uppercase text-xs">Authorization Flow</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Encrypted Node Access Logs</p>
            </div>
          </div>
          <button className="btn-yellow-pro text-[10px] shadow-md">Export Audit</button>
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center p-12 hover:bg-slate-50 transition-all rounded-sm border-l-2 border-transparent hover:border-pinnacle-accent">
              <div className="flex items-center gap-24">
                <span className="text-[11px] font-mono text-slate-400">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                <span className="text-xs font-bold text-pinnacle-navy/70 tracking-tight">NODE_AUTH_SUCCESS: <span className="text-pinnacle-navy font-black">X-CLUSTER-0{i}</span></span>
              </div>
              <div className="flex items-center gap-8">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Verified</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
);

export default ArchonCenter;

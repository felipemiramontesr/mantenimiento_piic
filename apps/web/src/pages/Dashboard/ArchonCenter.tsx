import React from 'react';
import { Settings, ShieldAlert } from 'lucide-react';



interface TelemetryWidgetProps {
  label: string;
  value: string;
  trend: string;
}

const TelemetryWidget: React.FC<TelemetryWidgetProps> = ({ label, value, trend }) => (
  <div className="card-minimalist p-24 rounded-sm transition-all duration-200">
    <div className="flex justify-between items-start mb-8">
      <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">{label}</p>
      <div className="w-4 h-4 border-t border-r border-pinnacle-accent/20" />
    </div>
    <div className="flex items-baseline gap-12">
      <h3 className="text-3xl font-black text-white text-data-pro leading-tight">{value}</h3>
      <span className={`text-[10px] font-bold uppercase tracking-tight ${
        trend === 'Online' || trend.startsWith('+') ? 'text-green-500' : 'text-pinnacle-accent'
      }`}>
        {trend}
      </span>
    </div>
    <div className="mt-12 h-[1px] w-full bg-white/5" />
  </div>
);

const ArchonCenter: React.FC = () => (
    <div className="p-48 lg:p-64 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <header className="mb-64">
        <div className="flex items-center gap-8 mb-4">
          <div className="w-8 h-[1px] bg-pinnacle-accent" />
          <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/20">V.2.2.0 / Core Readiness</p>
        </div>
        <div className="flex justify-between items-end border-b border-white/5 pb-24">
          <h2 className="text-white tracking-tight font-black text-3xl uppercase">Dashboard</h2>
          <div className="flex items-center gap-12">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Status: Nominal</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
        <TelemetryWidget label="Database" value="100%" trend="+0.00" />
        <TelemetryWidget label="Fleet" value="42" trend="Active" />
        <TelemetryWidget label="Resource" value="24%" trend="Normal" />
      </div>

      <div className="mt-24 card-minimalist p-32 rounded-sm relative group overflow-hidden">
        <div className="absolute top-0 right-0 p-16 opacity-[0.03]">
          <Settings className="w-48 h-48 text-white" />
        </div>
        
        <div className="flex items-center gap-12 mb-32 pb-16 border-b border-white/5">
          <ShieldAlert className="w-14 h-14 text-pinnacle-accent/60" />
          <h3 className="text-white/80 tracking-widest font-bold uppercase text-[11px]">System Logs</h3>
        </div>

        <div className="space-y-4 font-mono text-white/60">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center p-8 hover:bg-white/5 transition-colors text-[12px]">
              <div className="flex items-center gap-16">
                <span className="text-pinnacle-accent/40">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                <span className="uppercase tracking-tight">Access_Token_Validated: Node_V{i}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-1 h-1 bg-green-500/40 rounded-full" />
                <span className="text-[10px] uppercase tracking-tighter opacity-30">Secure</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
);

export default ArchonCenter;

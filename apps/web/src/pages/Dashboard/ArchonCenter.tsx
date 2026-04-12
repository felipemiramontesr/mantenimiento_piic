import React from 'react';



interface TelemetryWidgetProps {
  label: string;
  value: string;
  trend: string;
}

const TelemetryWidget: React.FC<TelemetryWidgetProps> = ({ label, value, trend }) => (
  <div className="frosted-panel hud-border-accent p-24 rounded-[4px] scanline-container group hover:border-white/20 transition-all duration-300">
    <div className="flex justify-between items-start mb-16">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">{label}</p>
      <div className="w-8 h-8 border-t border-r border-pinnacle-accent/30" />
    </div>
    <div className="flex items-baseline gap-16">
      <h3 className="text-[36px] font-black text-white hud-text-data leading-none">{value}</h3>
      <span className={`text-[10px] font-black uppercase tracking-widest ${
        trend === 'Online' || trend.startsWith('+') ? 'text-green-500' : 'text-pinnacle-accent'
      }`}>
        {trend}
      </span>
    </div>
    <div className="mt-16 h-[2px] w-full bg-white/5 overflow-hidden">
      <div className="h-full bg-pinnacle-accent/40 w-[65%] animate-pulse" />
    </div>
  </div>
);

const ArchonCenter: React.FC = () => (
    <div className="p-32 animate-in fade-in duration-700 max-w-[1400px] mx-auto">
      <header className="flex justify-between items-end mb-80 border-b border-white/5 pb-24 relative">
        <div className="absolute bottom-0 left-0 w-40 h-[2px] bg-pinnacle-accent" />
        <div>
          <div className="flex items-center gap-12 mb-8">
            <div className="w-12 h-2 bg-pinnacle-accent" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-pinnacle-accent">System_Monitor_v2.1</p>
          </div>
          <h2 className="text-white tracking-[-0.02em] font-black text-4xl uppercase">Telemetry Overview</h2>
        </div>
        <div className="frosted-panel px-24 py-12 rounded-[2px] border border-white/10 flex items-center gap-12">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Status: Optimum</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-24">
        <TelemetryWidget label="Database Health" value="100%" trend="+0.02%" />
        <TelemetryWidget label="Active Fleet" value="42" trend="Units Online" />
        <TelemetryWidget label="CPU Load" value="24%" trend="Nominal" />
      </div>

      <div className="mt-32 frosted-panel p-32 rounded-[4px] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-16 opacity-10">
          <Settings className="w-64 h-64 text-white rotate-12" />
        </div>
        
        <div className="flex items-center gap-12 mb-32">
          <ShieldAlert className="w-16 h-16 text-pinnacle-accent" />
          <h3 className="text-white tracking-widest font-black uppercase text-sm">Recent Activity Logs</h3>
        </div>

        <div className="space-y-8 font-mono">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center p-12 hover:bg-white/5 transition-colors border-l border-white/10">
              <div className="flex items-center gap-16">
                <span className="text-[10px] text-pinnacle-accent">[{new Date().toLocaleTimeString()}]</span>
                <span className="text-sm text-white/70 uppercase tracking-tight">Archon_Access: Telemetry_Terminal_V{i}</span>
              </div>
              <span className="text-[10px] text-white/30 font-black tracking-widest uppercase">Validated</span>
            </div>
          ))}
        </div>
      </div>
    </div>
);

export default ArchonCenter;

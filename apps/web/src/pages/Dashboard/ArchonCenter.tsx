import React from 'react';



interface TelemetryWidgetProps {
  label: string;
  value: string;
  trend: string;
}

const TelemetryWidget: React.FC<TelemetryWidgetProps> = ({ label, value, trend }) => (
  <div className="glass-morphism p-24 rounded-pinnacle-card shadow-pinnacle border-l-4 border-l-pinnacle-accent">
    <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-8">{label}</p>
    <div className="flex items-baseline gap-16">
      <h3 className="text-[32px] font-bold text-pinnacle-primary">{value}</h3>
      <span className="text-xs text-green-600 font-bold">{trend}</span>
    </div>
  </div>
);

const ArchonCenter: React.FC = () => (
    <div className="p-32 animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-80">
        <div>
          <h2 className="text-pinnacle-primary tracking-tight font-black text-3xl">Telemetry Overview</h2>
          <p className="text-pinnacle-text/60 mt-2">Real-time system health audit</p>
        </div>
        <div className="glass-morphism px-24 py-8 rounded-full border border-pinnacle-accent/30 text-[11px] font-black uppercase tracking-widest text-pinnacle-primary">
          STATUS: OPTIMUM
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-32">
        <TelemetryWidget label="Database Health" value="100%" trend="+0.02%" />
        <TelemetryWidget label="Active Fleet" value="42 Units" trend="Online" />
        <TelemetryWidget label="CPU Load" value="24%" trend="Normal" />
      </div>

      <div className="mt-80 glass-morphism p-32 rounded-pinnacle-card border border-white/5">
        <h3 className="text-pinnacle-primary tracking-tight font-bold mb-24">Recent Activity Logs</h3>
        <div className="space-y-16">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center border-b border-gray-200/20 pb-16">
              <span className="text-sm font-medium text-pinnacle-text/80">Archon accessed Telemetry V1</span>
              <span className="text-xs text-gray-400 font-bold">2 minutes ago</span>
            </div>
          ))}
        </div>
      </div>
    </div>
);

export default ArchonCenter;

import React from 'react';
import { LayoutDashboard, Truck, Settings, ShieldAlert, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active }) => (
  <div
    className={`flex items-center gap-16 p-16 rounded-pinnacle-input cursor-pointer transition-all ${
      active
        ? 'bg-pinnacle-accent text-pinnacle-primary font-bold'
        : 'hover:bg-white/5 text-white/60'
    }`}
  >
    {icon}
    <span>{label}</span>
  </div>
);

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

const ArchonDashboard: React.FC = () => {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('user_data') || '{}') as { username?: string };

  const handleLogout = (): void => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-pinnacle-bg">
      {/* Sidebar 280px */}
      <aside className="w-[280px] bg-pinnacle-primary text-white flex flex-col p-24">
        <div className="flex items-center gap-16 mb-80">
          <div className="w-10 h-10 bg-pinnacle-accent rounded-full" />
          <div>
            <h1 className="text-[20px] font-bold tracking-tight">ARCHON CORE</h1>
            <p className="text-[10px] text-pinnacle-accent font-bold tracking-widest">
              ID: {userData.username || 'UNKNOWN'}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-16">
          <NavItem icon={<LayoutDashboard size={20} />} label="Command Center" active />
          <NavItem icon={<Truck size={20} />} label="Fleet Status" />
          <NavItem icon={<ShieldAlert size={20} />} label="Security Logs" />
          <NavItem icon={<Settings size={20} />} label="System Config" />
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-16 p-16 text-white/60 hover:text-pinnacle-accent transition-colors"
        >
          <LogOut size={20} />
          <span>Terminate Session</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-32">
        <header className="flex justify-between items-center mb-80">
          <div>
            <h2 className="text-pinnacle-primary">Telemetry Overview</h2>
            <p className="text-pinnacle-text/60">Real-time system health audit</p>
          </div>
          <div className="glass-morphism px-24 py-8 rounded-full border-pinnacle-accent/30 text-xs font-bold text-pinnacle-primary">
            STATUS: OPTIMUM
          </div>
        </header>

        <div className="grid grid-cols-3 gap-32">
          <TelemetryWidget label="Database Health" value="100%" trend="+0.02%" />
          <TelemetryWidget label="Active Fleet" value="42 Units" trend="Online" />
          <TelemetryWidget label="CPU Load" value="24%" trend="Normal" />
        </div>

        <div className="mt-80 glass-morphism p-32 rounded-pinnacle-card">
          <h3 className="text-pinnacle-primary font-bold mb-24">Recent Activity Logs</h3>
          <div className="space-y-16">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between border-b border-gray-100 pb-16">
                <span className="text-sm font-medium">Archon accessed Telemetry V1</span>
                <span className="text-xs text-gray-400">2 minutes ago</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ArchonDashboard;

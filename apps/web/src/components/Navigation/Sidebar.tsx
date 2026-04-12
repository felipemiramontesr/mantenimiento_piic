import React from 'react';
import { LayoutDashboard, Truck, ShieldAlert, Settings, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, path, active }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={(): void => navigate(path)}
      role="button"
      tabIndex={0}
      className={`flex items-center gap-16 p-16 rounded-pinnacle-input cursor-pointer transition-all ${
        active
          ? 'bg-pinnacle-accent text-pinnacle-primary font-bold shadow-[0_0_20px_rgba(242,183,5,0.2)]'
          : 'hover:bg-white/5 text-white/40 hover:text-white/80'
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isConfirming, setIsConfirming] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const userData = JSON.parse(localStorage.getItem('user_data') || '{}') as { username?: string };

  const handleLogout = (): void => {
    if (!isConfirming) {
      setIsConfirming(true);
      timerRef.current = setTimeout(() => {
        setIsConfirming(false);
      }, 3000);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    navigate('/login');
  };

  React.useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <aside className="w-[300px] frosted-panel border-r border-white/5 text-white flex flex-col p-24 m-16 rounded-[4px] shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-pinnacle-accent/30" />
      
      <div className="flex items-center gap-16 mb-80 cursor-pointer group" onClick={(): void => navigate('/dashboard')} role="button" tabIndex={0}>
        <div className="w-12 h-12 bg-pinnacle-accent rounded-sm rotate-45 group-hover:rotate-90 transition-transform duration-500" />
        <div>
          <h1 className="text-[18px] font-black tracking-[-0.05em] text-white">ARCHON<span className="text-pinnacle-accent">CORE</span></h1>
          <div className="flex items-center gap-8 mt-1">
            <div className="px-6 py-1 bg-white/5 border border-white/10 rounded-[2px]">
              <p className="text-[9px] text-pinnacle-accent font-black uppercase tracking-[0.2em] leading-none">
                SYS_AUTH: {userData.username || 'UNKNOWN'}
              </p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-16">
        <NavItem 
          icon={<LayoutDashboard size={20} />} 
          label="Command Center" 
          path="/dashboard" 
          active={location.pathname === '/dashboard'} 
        />
        <NavItem 
          icon={<Truck size={20} />} 
          label="Fleet Status" 
          path="/dashboard/fleet" 
          active={location.pathname === '/dashboard/fleet'} 
        />
        <NavItem 
          icon={<ShieldAlert size={20} />} 
          label="Security Logs" 
          path="/dashboard/logs" 
          active={location.pathname === '/dashboard/logs'} 
        />
        <NavItem 
          icon={<Settings size={20} />} 
          label="System Config" 
          path="/dashboard/settings" 
          active={location.pathname === '/dashboard/settings'} 
        />
      </nav>

      <button
        onClick={handleLogout}
        className={`flex items-center gap-16 p-16 transition-all duration-300 w-full rounded-pinnacle-input ${
          isConfirming 
            ? 'bg-red-500/20 text-red-500 font-bold animate-pulse' 
            : 'text-white/60 hover:text-pinnacle-accent hover:bg-white/5'
        }`}
      >
        <LogOut size={20} className={isConfirming ? 'rotate-12 transition-transform' : ''} />
        <span>{isConfirming ? 'Confirm Logout?' : 'Terminate Session'}</span>
      </button>
    </aside>
  );
};

export default Sidebar;

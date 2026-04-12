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
          ? 'bg-pinnacle-accent text-pinnacle-primary font-bold'
          : 'hover:bg-white/5 text-white/60'
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
    <aside className="w-[280px] bg-pinnacle-primary text-white flex flex-col p-24">
      <div className="flex items-center gap-16 mb-80 cursor-pointer" onClick={(): void => navigate('/dashboard')} role="button" tabIndex={0}>
        <div className="w-10 h-10 bg-pinnacle-accent rounded-full" />
        <div>
          <h1 className="text-[20px] font-bold tracking-tight">ARCHON CORE</h1>
          <p className="text-[10px] text-pinnacle-accent font-bold tracking-widest">
            ID: {userData.username || 'UNKNOWN'}
          </p>
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

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
      className={`nav-item-pro cursor-pointer flex items-center gap-12 ${active ? 'active' : ''}`}
    >
      <div className={`${active ? 'text-pinnacle-accent' : 'text-white/40'}`}>
        {icon}
      </div>
      <span className="text-sm font-medium tracking-tight">{label}</span>
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
    <aside className="w-[260px] h-screen sidebar-solid-pro flex flex-col p-24 shrink-0 relative transition-all duration-300">
      <div className="absolute top-0 right-0 w-[1px] h-full bg-white/5" />


      
      <div className="flex items-center gap-12 mb-64 cursor-pointer group" onClick={(): void => navigate('/dashboard')} role="button" tabIndex={0}>
        <div className="w-8 h-8 bg-pinnacle-accent rounded-sm shadow-[0_0_15px_rgba(242,183,5,0.3)]" />
        <div>
          <h1 className="text-[14px] font-black tracking-widest text-white uppercase opacity-90">ARCHON<span className="text-pinnacle-accent">CORE</span></h1>
          <div className="flex items-center gap-8 mt-1">
            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest leading-none">
              {userData.username || 'archon'}
            </p>
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
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
        className={`flex items-center gap-12 p-12 transition-all duration-200 w-full group ${
          isConfirming 
            ? 'bg-red-500/20 text-red-500 font-bold rounded-sm' 
            : 'text-white/30 hover:text-white/70'
        }`}
      >
        <LogOut size={16} />
        <span className="text-[10px] font-bold uppercase tracking-widest">{isConfirming ? 'Confirm?' : 'Terminate Session'}</span>
      </button>
    </aside>
  );
};

export default Sidebar;

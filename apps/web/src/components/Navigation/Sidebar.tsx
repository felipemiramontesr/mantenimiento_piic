import React from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  ShieldAlert, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  active?: boolean;
  isCollapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, path, active, isCollapsed }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={(): void => navigate(path)}
      role="button"
      tabIndex={0}
      style={{
        padding: isCollapsed ? '16px 0' : '16px 24px',
        margin: '4px 0',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: isCollapsed ? '0' : '16px',
        transition: 'all 0.2s ease',
        borderLeft: active ? '3px solid #f2b705' : '3px solid transparent',
        backgroundColor: active ? 'rgba(242, 183, 5, 0.05)' : 'transparent'
      }}
      className="nav-item-pro cursor-pointer group"
      title={isCollapsed ? label : ''}
    >
      <div style={{ color: active ? '#f2b705' : 'rgba(255,255,255,0.4)' }}>
        {icon}
      </div>
      {!isCollapsed && (
        <span style={{ 
          fontSize: '13px', 
          fontWeight: 500, 
          color: active ? '#ffffff' : 'rgba(255,255,255,0.7)',
          letterSpacing: '-0.01em'
        }}>
          {label}
        </span>
      )}
    </div>
  );
};


export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isConfirming, setIsConfirming] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <aside 
      style={{ 
        backgroundColor: '#0f2a44', 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        position: 'relative',
        boxShadow: '4px 0 20px rgba(0,0,0,0.2)'
      }}
      className="sidebar-solid-pro shrink-0 transition-all duration-300 ease-in-out"
    >
      <div className="absolute top-0 right-0 w-[1px] h-full bg-white/5" />

      {/* Toggle Pestaña Central */}
      <button 
        onClick={onToggle}
        style={{
          position: 'absolute',
          right: '-14px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: '#f2b705',
          color: '#0f2a44',
          width: '28px',
          height: '48px',
          borderRadius: '0 8px 8px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          boxShadow: '4px 0 10px rgba(0,0,0,0.3)',
          zIndex: 100,
          cursor: 'pointer'
        }}
        className="hover:translate-x-1 transition-transform"
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* Header (10%) */}
      <div style={{
        height: '10%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        {!isCollapsed && (
          <h1 style={{ 
            fontSize: '18px', 
            fontWeight: 800, 
            color: '#f2b705', 
            letterSpacing: '0.05em',
            textTransform: 'none'
          }}>
            Archon <span style={{ color: '#ffffff' }}>Core</span>
          </h1>
        )}
        {isCollapsed && (
           <div style={{ width: '12px', height: '12px', backgroundColor: '#f2b705', borderRadius: '2px' }} />
        )}
      </div>

      {/* Body (80%) */}
      <div style={{
        height: '80%',
        padding: '24px 12px',
        overflowY: 'auto'
      }}>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Centro de Comando" 
            path="/dashboard" 
            active={location.pathname === '/dashboard'}
            isCollapsed={isCollapsed}
          />
          <NavItem 
            icon={<Truck size={20} />} 
            label="Estado de Flota" 
            path="/dashboard/fleet" 
            active={location.pathname === '/dashboard/fleet'}
            isCollapsed={isCollapsed}
          />
          <NavItem 
            icon={<ShieldAlert size={20} />} 
            label="Logs de Seguridad" 
            path="/dashboard/logs" 
            active={location.pathname === '/dashboard/logs'}
            isCollapsed={isCollapsed}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Configuración" 
            path="/dashboard/settings" 
            active={location.pathname === '/dashboard/settings'}
            isCollapsed={isCollapsed}
          />
        </nav>
      </div>

      {/* Footer (10%) */}
      <div style={{
        height: '10%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: isConfirming ? '#ef4444' : '#f2b705',
            color: '#0f2a44',
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Salir del Sistema"
        >
          <LogOut size={14} />
          {!isCollapsed && <span>{isConfirming ? '¿Seguro?' : 'Salir'}</span>}
        </button>
      </div>
    </aside>
  );
};


export default Sidebar;

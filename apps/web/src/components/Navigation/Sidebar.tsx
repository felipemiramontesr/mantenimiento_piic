import React from 'react';
import {
  LayoutDashboard,
  Truck,
  ShieldAlert,
  Users,
  Wrench,
  Navigation,
  Wallet,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  AlertTriangle,
  Bell,
  Globe,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import usePermissions from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import api from '../../api/client';
import useAlertsCount from '../../hooks/useAlertsCount';

/**
 * 🔱 Archon Component: Sidebar
 * Implementation: Sovereign Navigation Hub (V.78.100.88)
 * Objective: High-performance navigational orchestration.
 * Refactor: 100% Pure Tailwind Atomic Architecture (Mirror DNA).
 */

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
  badgeCount?: number;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  path,
  active,
  isCollapsed,
  badgeCount,
}) => {
  const navigate = useNavigate();
  const { setIsMobileMenuOpen } = useSovereignLayout();
  const showBadge = badgeCount != null && badgeCount > 0;
  const badgeLabel = badgeCount != null && badgeCount > 99 ? '99+' : String(badgeCount ?? 0);

  return (
    <div
      onClick={(): void => {
        navigate(path);
        setIsMobileMenuOpen(false); // Cierra menú al navegar en móvil
      }}
      role="button"
      tabIndex={0}
      className={`
        nav-item-pro cursor-pointer group flex items-center transition-all duration-200 rounded-[4px] my-1
        ${isCollapsed ? 'justify-center py-4' : 'justify-start py-4 px-4 gap-3'}
        ${
          active
            ? 'border-l-[3px] border-pinnacle-yellow bg-pinnacle-yellow/5'
            : 'border-l-[3px] border-transparent bg-transparent hover:bg-white/5'
        }
      `}
      title={isCollapsed ? label : ''}
      data-testid={`nav-item-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex flex-col items-center gap-0.5">
        <div
          className={`${
            active
              ? 'text-pinnacle-yellow'
              : 'text-white/40 group-hover:text-white/70 transition-colors'
          }`}
        >
          {icon}
        </div>
        {showBadge && isCollapsed && (
          <span
            data-testid="alerts-badge"
            className="min-w-[16px] h-4 px-1 rounded-full bg-[#C12020] text-white text-[10px] font-bold flex items-center justify-center leading-none"
          >
            {badgeLabel}
          </span>
        )}
      </div>
      {!isCollapsed && (
        <span
          className={`
            text-archon-lg font-medium tracking-tight transition-colors
            ${active ? 'text-white' : 'text-white/70 group-hover:text-white'}
          `}
        >
          {label}
        </span>
      )}
      {showBadge && !isCollapsed && (
        <span
          data-testid="alerts-badge"
          className="ml-auto min-w-[20px] h-5 px-1 rounded-full bg-[#C12020] text-white text-[10px] font-bold flex items-center justify-center"
        >
          {badgeLabel}
        </span>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, isOmnipotent, isExternalClientOnly, isSuiteVIM } = usePermissions();
  const { currentUser, logout } = useAuth();
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useSovereignLayout();
  const { count: alertsCount } = useAlertsCount();

  const resolveImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const baseUrl = (api.defaults.baseURL || '').replace(/\/+$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const fullImageUrl = resolveImageUrl(currentUser?.imageUrl);

  const goToProfile = (): void => {
    navigate('/dashboard/settings');
    setIsMobileMenuOpen(false);
  };

  const goToAdmin = (): void => {
    navigate('/dashboard/admin');
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* 🌑 MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[55] md:hidden backdrop-blur-sm transition-opacity"
          onClick={(): void => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:relative z-[60] md:z-50 flex flex-col h-full bg-pinnacle-navy shadow-[4px_0_20px_rgba(0,0,0,0.2)] shrink-0 transition-all duration-300 ease-in-out
          ${
            isMobileMenuOpen
              ? 'translate-x-0 w-[250px]'
              : '-translate-x-full md:translate-x-0 w-[250px] md:w-full'
          }
        `}
      >
        {/* 📏 AXIAL BORDER */}
        <div className="absolute top-0 right-0 w-[1px] h-full bg-white/5" />

        {/* 🔘 COLLAPSE TRIGGER (Desktop Only) */}
        <button
          onClick={onToggle}
          className="hidden md:flex absolute -right-7 top-1/2 -translate-y-1/2 w-7 h-12 bg-pinnacle-yellow text-pinnacle-navy rounded-r-[4px] items-center justify-center shadow-lg z-[100] cursor-pointer hover:brightness-110 transition-all duration-200"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* 🔱 HEADER (10%) */}
        <header
          className={`
          h-[10%] flex items-center border-b border-white/5 overflow-hidden transition-all duration-300
          ${isCollapsed ? 'justify-center p-0' : 'justify-start px-4 gap-3'}
        `}
        >
          <button
            onClick={goToProfile}
            title="Mi perfil"
            data-testid="nav-item-settings"
            className="w-10 h-10 rounded-[4px] shrink-0 overflow-hidden bg-white/10 flex items-center justify-center text-pinnacle-yellow border border-white/10 hover:brightness-125 transition-all duration-200 cursor-pointer outline-none border-none"
          >
            {fullImageUrl ? (
              <img
                src={fullImageUrl}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e): void => {
                  const target = e.target as HTMLImageElement;
                  target.src = '';
                }}
              />
            ) : (
              <UserIcon size={20} />
            )}
          </button>
          <div
            className={`
          transition-all duration-300 ease-in-out flex flex-col justify-center overflow-hidden whitespace-nowrap
          ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[150px] opacity-100'}
        `}
          >
            <span className="font-black text-sm tracking-tighter text-white uppercase truncate">
              {currentUser?.username || 'Soberano'}
            </span>
          </div>
        </header>

        {/* 🗺️ BODY (80%) */}
        <main className="h-[80%] py-6 px-3 overflow-y-auto custom-scrollbar">
          <nav className="flex flex-col">
            {hasPermission('maint:view') && (
              <NavItem
                icon={<Bell size={20} />}
                label="Alertas"
                path="/dashboard/alerts"
                active={location.pathname === '/dashboard/alerts'}
                isCollapsed={isCollapsed}
                badgeCount={alertsCount}
              />
            )}
            {!isExternalClientOnly() && (
              <NavItem
                icon={<LayoutDashboard size={20} />}
                label="Comando"
                path="/dashboard"
                active={location.pathname === '/dashboard'}
                isCollapsed={isCollapsed}
              />
            )}
            {hasPermission('financial:view') && (
              <NavItem
                icon={<Wallet size={20} />}
                label="Finanzas"
                path="/dashboard/financial"
                active={location.pathname === '/dashboard/financial'}
                isCollapsed={isCollapsed}
              />
            )}
            {hasPermission('fleet:view') && (
              <NavItem
                icon={<Truck size={20} />}
                label="Unidades"
                path="/dashboard/fleet"
                active={location.pathname === '/dashboard/fleet'}
                isCollapsed={isCollapsed}
              />
            )}
            {hasPermission('route:view') && (
              <NavItem
                icon={<Navigation size={20} />}
                label="Rutas"
                path="/dashboard/routes"
                active={location.pathname === '/dashboard/routes'}
                isCollapsed={isCollapsed}
              />
            )}
            {hasPermission('route:view') && (
              <NavItem
                icon={<AlertTriangle size={20} />}
                label="Incidencias"
                path="/dashboard/incidents"
                active={location.pathname.startsWith('/dashboard/incidents')}
                isCollapsed={isCollapsed}
              />
            )}
            {hasPermission('maint:view') && (
              <NavItem
                icon={<Wrench size={20} />}
                label="Mantenimiento"
                path="/dashboard/maintenance"
                active={location.pathname === '/dashboard/maintenance'}
                isCollapsed={isCollapsed}
              />
            )}
            {hasPermission('user:admin') && (
              <NavItem
                icon={<Users size={20} />}
                label="Personal"
                path="/dashboard/users"
                active={location.pathname === '/dashboard/users'}
                isCollapsed={isCollapsed}
              />
            )}
            {hasPermission('user:admin') && (
              <NavItem
                icon={<ShieldAlert size={20} />}
                label="Seguridad"
                path="/dashboard/logs"
                active={location.pathname === '/dashboard/logs'}
                isCollapsed={isCollapsed}
              />
            )}
            {(isOmnipotent() || isSuiteVIM()) && (
              <NavItem
                icon={<Globe size={20} />}
                label="Onboarding"
                path="/dashboard/onboarding"
                active={location.pathname === '/dashboard/onboarding'}
                isCollapsed={isCollapsed}
              />
            )}
          </nav>
        </main>

        {/* ⚙️ FOOTER (15%) */}
        <footer className="h-[15%] flex flex-col items-center justify-center px-4 gap-2 border-t border-white/5">
          {isOmnipotent() && (
            <button
              onClick={goToAdmin}
              className={`
                flex items-center justify-center rounded-[4px] font-bold text-archon-md uppercase tracking-widest transition-all duration-200 cursor-pointer shadow-md border-none outline-none overflow-hidden
                ${
                  location.pathname === '/dashboard/admin'
                    ? 'bg-white text-pinnacle-navy hover:brightness-95'
                    : 'bg-pinnacle-yellow text-pinnacle-navy hover:brightness-110'
                }
                ${isCollapsed ? 'w-10 h-10 px-0' : 'w-full h-10 px-4'}
              `}
              title="Administración del Sistema"
              data-testid="nav-item-admin"
            >
              <Users size={14} className="shrink-0" />
              <div
                className={`
                transition-all duration-300 ease-in-out flex flex-col justify-center overflow-hidden whitespace-nowrap
                ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[140px] opacity-100 ml-2'}
              `}
              >
                <span>Panel de Control</span>
              </div>
            </button>
          )}

          <button
            onClick={logout}
            className={`
              flex items-center justify-center rounded-[4px] font-bold text-archon-md uppercase tracking-widest transition-all duration-200 cursor-pointer shadow-md border-none outline-none overflow-hidden
              bg-pinnacle-yellow text-pinnacle-navy hover:brightness-110
              ${isCollapsed ? 'w-10 h-10 px-0' : 'w-full h-10 px-4'}
            `}
            title="Cerrar Sesión"
            data-testid="nav-item-logout"
          >
            <LogOut size={14} className="shrink-0" />
            <div
              className={`
                transition-all duration-300 ease-in-out flex flex-col justify-center overflow-hidden whitespace-nowrap
                ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[140px] opacity-100 ml-2'}
              `}
            >
              <span>Cerrar Sesión</span>
            </div>
          </button>
        </footer>
      </aside>
    </>
  );
};

export default Sidebar;

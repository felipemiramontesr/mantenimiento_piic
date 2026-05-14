import React from 'react';
import {
  LayoutDashboard,
  Truck,
  ShieldAlert,
  Settings,
  Users,
  Wrench,
  Navigation,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ArchonLogo from '../Logo/ArchonLogo';
import usePermissions from '../../hooks/usePermissions';

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
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, path, active, isCollapsed }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={(): void => navigate(path)}
      role="button"
      tabIndex={0}
      className={`
        nav-item-pro cursor-pointer group flex items-center transition-all duration-200 rounded-[4px] my-1
        ${isCollapsed ? 'justify-center py-4' : 'justify-start py-4 px-6 gap-4'}
        ${
          active
            ? 'border-l-[3px] border-pinnacle-yellow bg-pinnacle-yellow/5'
            : 'border-l-[3px] border-transparent bg-transparent hover:bg-white/5'
        }
      `}
      title={isCollapsed ? label : ''}
      data-testid={`nav-item-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div
        className={`${
          active
            ? 'text-pinnacle-yellow'
            : 'text-white/40 group-hover:text-white/70 transition-colors'
        }`}
      >
        {icon}
      </div>
      {!isCollapsed && (
        <span
          className={`
            text-[13px] font-medium tracking-tight transition-colors
            ${active ? 'text-white' : 'text-white/70 group-hover:text-white'}
          `}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = usePermissions();

  const goToSettings = (): void => {
    navigate('/dashboard/settings');
  };

  return (
    <aside className="relative z-50 flex flex-col w-full h-full bg-pinnacle-navy shadow-[4px_0_20px_rgba(0,0,0,0.2)] shrink-0 transition-all duration-300 ease-in-out">
      {/* 📏 AXIAL BORDER */}
      <div className="absolute top-0 right-0 w-[1px] h-full bg-white/5" />

      {/* 🔘 COLLAPSE TRIGGER */}
      <button
        onClick={onToggle}
        className="absolute -right-7 top-1/2 -translate-y-1/2 w-7 h-12 bg-pinnacle-yellow text-pinnacle-navy rounded-r-[4px] flex items-center justify-center shadow-lg z-[100] cursor-pointer hover:translate-x-1 transition-all"
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* 🔱 HEADER (10%) */}
      <header
        className={`
          h-[10%] flex items-center justify-center border-b border-white/5
          ${isCollapsed ? 'p-0' : 'px-6'}
        `}
      >
        <ArchonLogo isCollapsed={isCollapsed} size={isCollapsed ? 28 : 32} />
      </header>

      {/* 🗺️ BODY (80%) */}
      <main className="h-[80%] py-6 px-3 overflow-y-auto custom-scrollbar">
        <nav className="flex flex-col">
          <NavItem
            icon={<LayoutDashboard size={20} />}
            label="Comando"
            path="/dashboard"
            active={location.pathname === '/dashboard'}
            isCollapsed={isCollapsed}
          />
          {hasPermission('fleet:view') && (
            <NavItem
              icon={<Truck size={20} />}
              label="Unidades"
              path="/dashboard/fleet"
              active={location.pathname === '/dashboard/fleet'}
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
              icon={<Navigation size={20} />}
              label="Rutas"
              path="/dashboard/routes"
              active={location.pathname === '/dashboard/routes'}
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
        </nav>
      </main>

      {/* ⚙️ FOOTER (10%) */}
      <footer className="h-[10%] flex items-center justify-center px-6 border-t border-white/5">
        {hasPermission('user:admin') && (
          <button
            onClick={goToSettings}
            className={`
              w-full h-10 flex items-center justify-center gap-2 rounded-[4px] font-bold text-[11px] uppercase tracking-widest transition-all cursor-pointer
              ${
                location.pathname === '/dashboard/settings'
                  ? 'bg-white text-pinnacle-navy'
                  : 'bg-pinnacle-yellow text-pinnacle-navy hover:brightness-110 shadow-md'
              }
            `}
            title="Configuración de Sistema"
            data-testid="nav-item-settings"
          >
            <Settings size={14} />
            {!isCollapsed && <span>Configuración</span>}
          </button>
        )}
      </footer>
    </aside>
  );
};

export default Sidebar;

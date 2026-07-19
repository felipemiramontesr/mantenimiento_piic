import React, { useRef, useEffect, useState } from 'react';
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
  MapPin,
  Rss,
  Building2,
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

const ScrollContainerCtx = React.createContext<React.RefObject<HTMLElement> | undefined>(undefined);

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

  const scrollCtx = React.useContext(ScrollContainerCtx);
  const itemRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(1);
  const activeRef = useRef(active);
  useEffect((): void => {
    activeRef.current = active;
    if (active) setOpacity(1);
  }, [active]);
  useEffect(() => {
    const el = itemRef.current;
    const container = scrollCtx?.current ?? null;
    if (el && container) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setOpacity(activeRef.current ? 1 : entry.intersectionRatio);
        },
        {
          root: container,
          threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        }
      );
      observer.observe(el);
      return (): void => {
        observer.disconnect();
      };
    }
    return undefined;
  }, [scrollCtx]);

  return (
    <div
      ref={itemRef}
      style={{ opacity, transition: 'opacity 300ms ease-in-out' }}
      onClick={(): void => {
        navigate(path);
        setIsMobileMenuOpen(false); // Cierra menú al navegar en móvil
      }}
      role="button"
      tabIndex={0}
      className={`
        nav-item-pro cursor-pointer group flex items-center transition-all duration-200 rounded-[4px] my-1
        ${isCollapsed ? 'justify-center py-3' : 'justify-start py-3 px-4 gap-3'}
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
      <span
        aria-hidden={isCollapsed}
        className={`
          text-archon-lg font-medium tracking-tight whitespace-nowrap
          overflow-hidden transition-[color,opacity] duration-200 ease-in-out
          will-change-[opacity]
          ${isCollapsed ? 'w-0 opacity-0 pointer-events-none select-none' : 'opacity-100'}
          ${active ? 'text-white' : 'text-white/70 group-hover:text-white'}
        `}
      >
        {label}
      </span>
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
  const scrollRef = useRef<HTMLElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  // FC 082 F0c — ramas Familiar (rol 10) y Cliente Externo (rol 9) purgadas
  // junto con los nav-items CRM/Portal/Familia (084_AN §1a-1b).
  const { hasPermission, hasAnyPermission, isOmnipotent } = usePermissions();
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

  // FC 074 F2 — Escape cierra el drawer móvil (a11y).
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return (): void => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);

  // FC 074 F2 — Focus-trap: al abrir el drawer, el foco entra al primer nav item.
  useEffect(() => {
    if (isMobileMenuOpen) firstFocusableRef.current?.focus();
  }, [isMobileMenuOpen]);

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
        id="mobile-sidebar"
        className={`
          fixed md:relative z-[60] md:z-50 flex flex-col h-screen bg-pinnacle-navy shadow-[4px_0_20px_rgba(0,0,0,0.2)] shrink-0 transition-[width,transform] duration-300 ease-in-out pl-[env(safe-area-inset-left)]
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
          shrink-0 flex items-center border-b border-white/5 overflow-hidden transition-[padding,gap] duration-300
          ${isCollapsed ? 'justify-center pt-3 pb-1.5' : 'justify-start px-4 pt-3 pb-1.5 gap-3'}
        `}
        >
          <button
            ref={firstFocusableRef}
            onClick={goToProfile}
            title="Mi perfil"
            data-testid="nav-item-settings"
            className="w-11 h-11 rounded-[4px] shrink-0 overflow-hidden bg-white/10 flex items-center justify-center text-pinnacle-yellow border border-white/10 hover:brightness-125 transition-all duration-200 cursor-pointer outline-none border-none"
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
          transition-[opacity,transform] duration-200 ease-in-out flex flex-col justify-center overflow-hidden whitespace-nowrap
          ${
            isCollapsed
              ? 'opacity-0 -translate-x-2 pointer-events-none w-0'
              : 'opacity-100 translate-x-0'
          }
        `}
          >
            <span className="font-black text-sm tracking-tighter text-white uppercase truncate">
              {currentUser?.username || 'Soberano'}
            </span>
          </div>
        </header>

        {/* 🗺️ BODY (80%) — FC 078 F1(c): era <main> (dos landmarks main en
            el DOM + main anidado en aside = HTML inválido y A11Y rota, ver
            078_AN_F1c_ShellDiagnosis). Ahora <div>: el único <main> del
            documento es el workspace (Layout.tsx:35). Ref/máscara/clases
            intactas — cero cambio visual. */}
        <div
          ref={scrollRef as React.RefObject<HTMLDivElement>}
          data-mask-gradient="40"
          className="flex-1 min-h-0 py-6 px-3 overflow-y-auto custom-scrollbar"
          style={{
            maskImage:
              'linear-gradient(to bottom, transparent 0px, black 40px, black calc(100% - 40px), transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0px, black 40px, black calc(100% - 40px), transparent 100%)',
          }}
        >
          <ScrollContainerCtx.Provider value={scrollRef as React.RefObject<HTMLElement>}>
            <nav className="flex flex-col">
              <>
                {hasAnyPermission(['alert:view:any', 'alert:view:own']) && (
                  <NavItem
                    icon={<Bell size={20} />}
                    label="Alertas"
                    path="/dashboard/alerts"
                    active={location.pathname === '/dashboard/alerts'}
                    isCollapsed={isCollapsed}
                    badgeCount={alertsCount}
                  />
                )}
                <NavItem
                  icon={<LayoutDashboard size={20} />}
                  label="Comando"
                  path="/dashboard"
                  active={location.pathname === '/dashboard'}
                  isCollapsed={isCollapsed}
                />
                {hasAnyPermission(['finance:dashboard:view:any', 'finance:dashboard:view:own']) && (
                  <NavItem
                    icon={<Wallet size={20} />}
                    label="Finanzas"
                    path="/dashboard/financial"
                    active={location.pathname === '/dashboard/financial'}
                    isCollapsed={isCollapsed}
                  />
                )}
                {hasAnyPermission(['fleet:unit:view:any', 'fleet:unit:view:own']) && (
                  <NavItem
                    icon={<Truck size={20} />}
                    label="Unidades"
                    path="/dashboard/fleet"
                    active={location.pathname === '/dashboard/fleet'}
                    isCollapsed={isCollapsed}
                  />
                )}
                {hasAnyPermission([
                  'geolocation:view:any',
                  'geolocation:realtime:view',
                  'fleet:unit:view:any',
                  'fleet:unit:view:own',
                ]) && (
                  <NavItem
                    icon={<MapPin size={20} />}
                    label="Rastreo GPS"
                    path="/dashboard/tracking"
                    active={location.pathname === '/dashboard/tracking'}
                    isCollapsed={isCollapsed}
                  />
                )}
                <NavItem
                  icon={<Rss size={20} />}
                  label="Arcsial"
                  path="/dashboard/social"
                  active={location.pathname === '/dashboard/social'}
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  icon={<Building2 size={20} />}
                  label="Talleres"
                  path="/dashboard/talleres"
                  active={location.pathname === '/dashboard/talleres'}
                  isCollapsed={isCollapsed}
                />
                {hasAnyPermission(['route:record:view:any', 'route:record:view:own']) && (
                  <NavItem
                    icon={<Navigation size={20} />}
                    label="Rutas"
                    path="/dashboard/routes"
                    active={location.pathname === '/dashboard/routes'}
                    isCollapsed={isCollapsed}
                  />
                )}
                {hasAnyPermission(['route:record:view:any', 'route:record:view:own']) && (
                  <NavItem
                    icon={<AlertTriangle size={20} />}
                    label="Incidencias"
                    path="/dashboard/incidents"
                    active={location.pathname.startsWith('/dashboard/incidents')}
                    isCollapsed={isCollapsed}
                  />
                )}
                {hasAnyPermission(['maint:record:view:any', 'maint:record:view:own']) && (
                  <NavItem
                    icon={<Wrench size={20} />}
                    label="Mantenimiento"
                    path="/dashboard/maintenance"
                    active={location.pathname === '/dashboard/maintenance'}
                    isCollapsed={isCollapsed}
                  />
                )}
                {hasPermission('users:collaborator:view') && (
                  <NavItem
                    icon={<Users size={20} />}
                    label="Personal"
                    path="/dashboard/users"
                    active={location.pathname === '/dashboard/users'}
                    isCollapsed={isCollapsed}
                  />
                )}
                {hasPermission('security:audit:view') && (
                  <NavItem
                    icon={<ShieldAlert size={20} />}
                    label="Seguridad"
                    path="/dashboard/logs"
                    active={location.pathname === '/dashboard/logs'}
                    isCollapsed={isCollapsed}
                  />
                )}
                {isOmnipotent() && (
                  <NavItem
                    icon={<Globe size={20} />}
                    label="Onboarding"
                    path="/dashboard/onboarding"
                    active={location.pathname === '/dashboard/onboarding'}
                    isCollapsed={isCollapsed}
                  />
                )}
              </>
            </nav>
          </ScrollContainerCtx.Provider>
        </div>

        {/* ⚙️ FOOTER (15%) */}
        <footer className="shrink-0 flex flex-col items-center justify-center py-3 px-3 gap-2 border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
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
                ${isCollapsed ? 'w-11 h-11 px-0' : 'w-full h-11 px-4'}
              `}
              title="Administración del Sistema"
              data-testid="nav-item-admin"
            >
              <Users size={14} className="shrink-0" />
              <div
                className={`
                transition-[opacity,transform] duration-200 ease-in-out flex flex-col justify-center overflow-hidden whitespace-nowrap
                ${
                  isCollapsed
                    ? 'opacity-0 -translate-x-1 pointer-events-none w-0'
                    : 'opacity-100 translate-x-0 ml-2'
                }
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
              ${isCollapsed ? 'w-11 h-11 px-0' : 'w-full h-11 px-4'}
            `}
            title="Cerrar Sesión"
            data-testid="nav-item-logout"
          >
            <LogOut size={14} className="shrink-0" />
            <div
              className={`
                transition-[opacity,transform] duration-200 ease-in-out flex flex-col justify-center overflow-hidden whitespace-nowrap
                ${
                  isCollapsed
                    ? 'opacity-0 -translate-x-1 pointer-events-none w-0'
                    : 'opacity-100 translate-x-0 ml-2'
                }
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

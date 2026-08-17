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

/** Resolves a stored profile image path against the API base URL — pure, no hooks needed. */
function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const baseUrl = (api.defaults.baseURL || '').replace(/\/+$/, '');
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** FC 074 F2 — Escape cierra el drawer móvil + focus-trap al primer nav item (a11y). */
function useMobileDrawerA11y(
  isOpen: boolean,
  onClose: () => void,
  firstFocusableRef: React.RefObject<HTMLButtonElement>
): void {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return (): void => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) firstFocusableRef.current?.focus();
  }, [isOpen, firstFocusableRef]);
}

interface MobileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

/** 🌑 MOBILE OVERLAY — extracted to keep `Sidebar` under budget. */
function MobileOverlay({ isOpen, onClose }: MobileOverlayProps): React.ReactElement | null {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black/60 z-[55] md:hidden backdrop-blur-sm transition-opacity"
      onClick={onClose}
    />
  );
}

interface CollapseTriggerProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

/** 🔘 COLLAPSE TRIGGER (Desktop Only) — extracted to keep `Sidebar` under budget. */
function CollapseTrigger({ isCollapsed, onToggle }: CollapseTriggerProps): React.ReactElement {
  return (
    <button
      onClick={onToggle}
      className="hidden md:flex absolute -right-7 top-1/2 -translate-y-1/2 w-7 h-12 bg-pinnacle-yellow text-pinnacle-navy rounded-r-[4px] items-center justify-center shadow-lg z-[100] cursor-pointer hover:brightness-110 transition-all duration-200"
    >
      {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
    </button>
  );
}

interface SidebarAvatarButtonProps {
  fullImageUrl: string | null;
  onProfileClick: () => void;
  firstFocusableRef: React.RefObject<HTMLButtonElement>;
}

/** Avatar/profile trigger button — extracted so `SidebarProfileHeader` stays under budget. */
function SidebarAvatarButton({
  fullImageUrl,
  onProfileClick,
  firstFocusableRef,
}: SidebarAvatarButtonProps): React.ReactElement {
  return (
    <button
      ref={firstFocusableRef}
      onClick={onProfileClick}
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
  );
}

interface SidebarProfileHeaderProps {
  isCollapsed: boolean;
  fullImageUrl: string | null;
  username: string;
  onProfileClick: () => void;
  firstFocusableRef: React.RefObject<HTMLButtonElement>;
}

/** 🔱 HEADER (10%) — extracted to keep `Sidebar` under budget. */
function SidebarProfileHeader({
  isCollapsed,
  fullImageUrl,
  username,
  onProfileClick,
  firstFocusableRef,
}: SidebarProfileHeaderProps): React.ReactElement {
  return (
    <header
      className={`
      shrink-0 flex items-center border-b border-white/5 overflow-hidden transition-[padding,gap] duration-300
      ${isCollapsed ? 'justify-center pt-3 pb-1.5' : 'justify-start px-4 pt-3 pb-1.5 gap-3'}
    `}
    >
      <SidebarAvatarButton
        fullImageUrl={fullImageUrl}
        onProfileClick={onProfileClick}
        firstFocusableRef={firstFocusableRef}
      />
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
          {username}
        </span>
      </div>
    </header>
  );
}

interface PermCheckers {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  isOmegaStrict: () => boolean;
}

interface NavEntryConfig {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  active: boolean;
  visible: boolean;
  badgeCount?: number;
}

/** Alertas/Comando/Finanzas — extracted so `buildNavEntries` stays under budget. */
function buildCoreNavEntries(
  pathname: string,
  { hasAnyPermission }: PermCheckers,
  alertsCount: number
): NavEntryConfig[] {
  return [
    {
      key: 'alerts',
      icon: <Bell size={20} />,
      label: 'Alertas',
      path: '/dashboard/alerts',
      active: pathname === '/dashboard/alerts',
      visible: hasAnyPermission(['alert:view:any', 'alert:view:own']),
      badgeCount: alertsCount,
    },
    {
      key: 'comando',
      icon: <LayoutDashboard size={20} />,
      label: 'Comando',
      path: '/dashboard',
      active: pathname === '/dashboard',
      visible: true,
    },
    {
      key: 'finanzas',
      icon: <Wallet size={20} />,
      label: 'Finanzas',
      path: '/dashboard/financial',
      active: pathname === '/dashboard/financial',
      visible: hasAnyPermission(['finance:dashboard:view:any', 'finance:dashboard:view:own']),
    },
  ];
}

/** Unidades/Rastreo GPS/Arcsial/Talleres — extracted so `buildNavEntries` stays under budget. */
function buildFleetNavEntries(
  pathname: string,
  { hasAnyPermission }: PermCheckers
): NavEntryConfig[] {
  return [
    {
      key: 'unidades',
      icon: <Truck size={20} />,
      label: 'Unidades',
      path: '/dashboard/fleet',
      active: pathname === '/dashboard/fleet',
      visible: hasAnyPermission(['fleet:unit:view:any', 'fleet:unit:view:own']),
    },
    {
      key: 'tracking',
      icon: <MapPin size={20} />,
      label: 'Rastreo GPS',
      path: '/dashboard/tracking',
      active: pathname === '/dashboard/tracking',
      visible: hasAnyPermission([
        'geolocation:view:any',
        'geolocation:realtime:view',
        'fleet:unit:view:any',
        'fleet:unit:view:own',
      ]),
    },
    {
      key: 'arcsial',
      icon: <Rss size={20} />,
      label: 'Arcsial',
      path: '/dashboard/social',
      active: pathname === '/dashboard/social',
      visible: true,
    },
    {
      key: 'talleres',
      icon: <Building2 size={20} />,
      label: 'Talleres',
      path: '/dashboard/talleres',
      active: pathname === '/dashboard/talleres',
      visible: true,
    },
  ];
}

/** Rutas/Incidencias/Mantenimiento — extracted so `buildNavEntries` stays under budget. */
function buildOperationsNavEntries(
  pathname: string,
  { hasAnyPermission }: PermCheckers
): NavEntryConfig[] {
  return [
    {
      key: 'rutas',
      icon: <Navigation size={20} />,
      label: 'Rutas',
      path: '/dashboard/routes',
      active: pathname === '/dashboard/routes',
      visible: hasAnyPermission(['route:record:view:any', 'route:record:view:own']),
    },
    {
      key: 'incidencias',
      icon: <AlertTriangle size={20} />,
      label: 'Incidencias',
      path: '/dashboard/incidents',
      active: pathname.startsWith('/dashboard/incidents'),
      visible: hasAnyPermission(['route:record:view:any', 'route:record:view:own']),
    },
    {
      key: 'mantenimiento',
      icon: <Wrench size={20} />,
      label: 'Mantenimiento',
      path: '/dashboard/maintenance',
      active: pathname === '/dashboard/maintenance',
      visible: hasAnyPermission(['maint:record:view:any', 'maint:record:view:own']),
    },
  ];
}

/** Personal/Seguridad/Cosmología — extracted so `buildNavEntries` stays under budget. */
function buildAdminNavEntries(
  pathname: string,
  { hasPermission, isOmegaStrict }: PermCheckers
): NavEntryConfig[] {
  return [
    {
      key: 'personal',
      icon: <Users size={20} />,
      label: 'Personal',
      path: '/dashboard/users',
      active: pathname === '/dashboard/users',
      visible: hasPermission('users:collaborator:view'),
    },
    {
      key: 'seguridad',
      icon: <ShieldAlert size={20} />,
      label: 'Seguridad',
      path: '/dashboard/logs',
      active: pathname === '/dashboard/logs',
      visible: hasPermission('security:audit:view'),
    },
    {
      key: 'cosmologia',
      icon: <Globe size={20} />,
      label: 'Cosmología',
      path: '/dashboard/cosmology',
      active: pathname === '/dashboard/cosmology',
      visible: isOmegaStrict(),
    },
  ];
}

/** Orden estable: Alertas, Comando, Finanzas, Unidades, Rastreo GPS, Arcsial,
 *  Talleres, Rutas, Incidencias, Mantenimiento, Personal, Seguridad,
 *  Cosmología — idéntico al orden JSX original. */
function buildNavEntries(
  pathname: string,
  perms: PermCheckers,
  alertsCount: number
): NavEntryConfig[] {
  return [
    ...buildCoreNavEntries(pathname, perms, alertsCount),
    ...buildFleetNavEntries(pathname, perms),
    ...buildOperationsNavEntries(pathname, perms),
    ...buildAdminNavEntries(pathname, perms),
  ];
}

interface SidebarNavListProps {
  isCollapsed: boolean;
  pathname: string;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  isOmegaStrict: () => boolean;
  alertsCount: number;
  scrollRef: React.RefObject<HTMLElement>;
}

/** 🗺️ BODY (80%) — FC 078 F1(c): era <main> (dos landmarks main en el DOM +
 *  main anidado en aside = HTML inválido y A11Y rota, ver
 *  078_AN_F1c_ShellDiagnosis). Ahora <div>: el único <main> del documento es
 *  el workspace (Layout.tsx:35). Ref/máscara/clases intactas — cero cambio
 *  visual. Extracted to keep `Sidebar` under budget. */
function SidebarNavList({
  isCollapsed,
  pathname,
  hasPermission,
  hasAnyPermission,
  isOmegaStrict,
  alertsCount,
  scrollRef,
}: SidebarNavListProps): React.ReactElement {
  const entries = buildNavEntries(
    pathname,
    { hasPermission, hasAnyPermission, isOmegaStrict },
    alertsCount
  );
  return (
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
      <ScrollContainerCtx.Provider value={scrollRef}>
        <nav className="flex flex-col">
          {entries
            .filter((entry) => entry.visible)
            .map((entry) => (
              <NavItem
                key={entry.key}
                icon={entry.icon}
                label={entry.label}
                path={entry.path}
                active={entry.active}
                isCollapsed={isCollapsed}
                badgeCount={entry.badgeCount}
              />
            ))}
        </nav>
      </ScrollContainerCtx.Provider>
    </div>
  );
}

interface SidebarFooterProps {
  isCollapsed: boolean;
  onLogout: () => void;
}

/** ⚙️ FOOTER (15%) — FC 082 F3c2: botón "Panel de Control" (/dashboard/admin)
 *  retirado junto con RolesManager/RolePermissionsMatrix. Extracted to keep
 *  `Sidebar` under budget. */
function SidebarFooter({ isCollapsed, onLogout }: SidebarFooterProps): React.ReactElement {
  return (
    <footer className="shrink-0 flex flex-col items-center justify-center py-3 px-3 gap-2 border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
      <button
        onClick={onLogout}
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
  );
}

/** `<aside>` shell className — extracted so `Sidebar` stays under budget. */
function asideClassName(isMobileMenuOpen: boolean): string {
  return `
    fixed md:relative z-[60] md:z-50 flex flex-col h-screen bg-pinnacle-navy shadow-[4px_0_20px_rgba(0,0,0,0.2)] shrink-0 transition-[width,transform] duration-300 ease-in-out pl-[env(safe-area-inset-left)]
    ${
      isMobileMenuOpen
        ? 'translate-x-0 w-[250px]'
        : '-translate-x-full md:translate-x-0 w-[250px] md:w-full'
    }
  `;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef<HTMLElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  // FC 082 F0c — ramas Familiar (rol 10) y Cliente Externo (rol 9) purgadas
  // junto con los nav-items CRM/Portal/Familia (084_AN §1a-1b).
  const { hasPermission, hasAnyPermission, isOmegaStrict } = usePermissions();
  const { currentUser, logout } = useAuth();
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useSovereignLayout();
  const { count: alertsCount } = useAlertsCount();

  const fullImageUrl = resolveImageUrl(currentUser?.imageUrl);

  const goToProfile = (): void => {
    navigate('/dashboard/settings');
    setIsMobileMenuOpen(false);
  };

  useMobileDrawerA11y(isMobileMenuOpen, (): void => setIsMobileMenuOpen(false), firstFocusableRef);

  return (
    <>
      <MobileOverlay isOpen={isMobileMenuOpen} onClose={(): void => setIsMobileMenuOpen(false)} />

      <aside id="mobile-sidebar" className={asideClassName(isMobileMenuOpen)}>
        {/* 📏 AXIAL BORDER */}
        <div className="absolute top-0 right-0 w-[1px] h-full bg-white/5" />

        <CollapseTrigger isCollapsed={isCollapsed} onToggle={onToggle} />

        <SidebarProfileHeader
          isCollapsed={isCollapsed}
          fullImageUrl={fullImageUrl}
          username={currentUser?.username || 'Soberano'}
          onProfileClick={goToProfile}
          firstFocusableRef={firstFocusableRef}
        />

        <SidebarNavList
          isCollapsed={isCollapsed}
          pathname={location.pathname}
          hasPermission={hasPermission}
          hasAnyPermission={hasAnyPermission}
          isOmegaStrict={isOmegaStrict}
          alertsCount={alertsCount}
          scrollRef={scrollRef}
        />

        <SidebarFooter isCollapsed={isCollapsed} onLogout={logout} />
      </aside>
    </>
  );
};

export default Sidebar;

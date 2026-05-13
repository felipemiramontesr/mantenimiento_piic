import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Zap,
  Truck,
  Map,
  Users,
  Shield,
  BarChart3,
  Activity,
  FileText,
  Search,
  Cpu,
  Wrench,
  AlertTriangle,
  Navigation,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import api from '../../api/client';

/**
 * 🔱 Archon Component: SovereignHeader
 * Implementation: Sovereign Identity & Section Metadata Orchestration
 * Objective: High-density header with dynamic titles, user profile menu, and industrial icons.
 * v.1.1.0 - Iconography Update
 */

const SovereignHeader: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { layoutData } = useSovereignLayout();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = (): void => setIsMenuOpen(!isMenuOpen);

  const handleSettings = (): void => {
    setIsMenuOpen(false);
    navigate('/dashboard/settings');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resolveImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const baseUrl = (api.defaults.baseURL || '').replace(/\/+$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const fullImageUrl = resolveImageUrl(currentUser?.imageUrl);

  // 🛡️ Icon Mapping Engine
  const getHeaderIcons = (title: string): { main: React.ElementType; sub: React.ElementType } => {
    const normalizedTitle = title.trim();
    if (normalizedTitle.includes('Comando')) return { main: LayoutDashboard, sub: Zap };
    if (normalizedTitle.includes('Flota')) return { main: Truck, sub: Settings };
    if (normalizedTitle.includes('Ruta')) return { main: Map, sub: Navigation };
    if (normalizedTitle.includes('Usuario')) return { main: Users, sub: Shield };
    if (normalizedTitle.includes('Financiera')) return { main: BarChart3, sub: Activity };
    if (normalizedTitle.includes('Registro') || normalizedTitle.includes('Log'))
      return { main: FileText, sub: Search };
    if (normalizedTitle.includes('Ajuste') || normalizedTitle.includes('Config'))
      return { main: Settings, sub: Cpu };
    if (normalizedTitle.includes('Mantenimiento')) return { main: Wrench, sub: AlertTriangle };
    return { main: Shield, sub: Zap };
  };

  const { main: MainIcon, sub: SubIcon } = getHeaderIcons(layoutData.title);

  return (
    <header className="workspace-header-pro w-full" style={{ zIndex: 50 }}>
      {/* 🛡️ Section Identification (Col Alfa) */}
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-3">
          <MainIcon size={20} className="text-[#f2b705]" strokeWidth={2.5} />
          <h2 className="text-[#0f2a44] tracking-tighter font-black text-2xl m-0 p-0 leading-[0.9]">
            {layoutData.title}
          </h2>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <SubIcon size={10} className="text-[#f2b705] opacity-70" strokeWidth={3} />
          <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.25em] opacity-50">
            {layoutData.description}
          </p>
        </div>
      </div>

      {/* 👤 Sovereign Identity (Col Beta) */}
      <div className="flex items-center gap-6 relative" ref={menuRef}>
        <h1 className="text-[#0f2a44] font-black text-sm tracking-tighter hidden md:block opacity-80 uppercase">
          {currentUser?.username || 'Soberano'}
        </h1>

        <div className="relative">
          <button
            onClick={toggleMenu}
            className={`
              w-[44px] h-[44px] rounded-[4px] flex items-center justify-center transition-all duration-300 overflow-hidden border-transparent
              ${isMenuOpen ? 'border-[#f2b705]' : 'hover:border-[#f2b705]'}
            `}
            style={{ borderWidth: '1px' }}
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
              <div className="w-full h-full bg-[#0f2a44] flex items-center justify-center text-[#f2b705]">
                <UserIcon size={20} />
              </div>
            )}
          </button>

          {isMenuOpen && (
            <div className="absolute top-[50px] right-0 w-[180px] bg-white rounded-[4px] shadow-[0_10px_40px_rgba(15,42,68,0.12)] py-4 animate-in fade-in slide-in-from-top-1 duration-200 z-[110]">
              <button
                onClick={handleSettings}
                className="w-full px-16 py-12 flex items-center gap-12 hover:bg-[#f2b705]/5 text-[#0f2a44] transition-colors text-left border-0 bg-transparent"
              >
                <Settings size={14} className="text-[#f2b705]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Ajustes</span>
              </button>

              <button
                onClick={logout}
                className="w-full px-16 py-12 flex items-center gap-12 hover:bg-rose-50/50 text-rose-600 transition-colors text-left border-0 bg-transparent"
              >
                <LogOut size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Cerrar Sesión
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default SovereignHeader;

import React, { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

/**
 * 🔱 Archon Component: ArchonTopBar
 * Implementation: Universal Identity Orchestration (V.78.100.91)
 * Aesthetic: Sovereign Minimalism with Premium Dropdowns
 * Refactor: 100% Pure Tailwind Atomic Architecture (Mirror DNA).
 */

const ArchonTopBar: React.FC = () => {
  const { currentUser, logout } = useAuth();
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

  return (
    <div className="fixed top-0 right-0 p-6 md:p-10 z-[100] flex items-center gap-6 pointer-events-none">
      <div className="flex items-center gap-6 pointer-events-auto" ref={menuRef}>
        <h1 className="text-pinnacle-navy font-black text-2xl tracking-tighter hidden md:block opacity-90 leading-none">
          {currentUser?.username || 'Soberano'}
        </h1>

        <div className="relative">
          <button
            onClick={toggleMenu}
            className={`
              w-[57px] h-[57px] rounded-[4px] flex items-center justify-center transition-all duration-300 overflow-hidden border bg-transparent outline-none
              ${
                isMenuOpen
                  ? 'border-pinnacle-yellow shadow-md'
                  : 'border-transparent hover:border-pinnacle-yellow'
              }
            `}
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
              <div className="w-full h-full bg-pinnacle-navy flex items-center justify-center text-pinnacle-yellow">
                <UserIcon size={20} />
              </div>
            )}
          </button>

          {isMenuOpen && (
            <div className="absolute top-[64px] right-0 w-[180px] bg-white rounded-[4px] shadow-[0_10px_40px_rgba(15,42,68,0.12)] py-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <button
                onClick={handleSettings}
                className="w-full px-6 py-4 flex items-center gap-3 hover:bg-pinnacle-yellow/5 text-pinnacle-navy transition-colors text-left border-none bg-transparent cursor-pointer"
              >
                <Settings size={14} className="text-pinnacle-yellow" />
                <span className="text-archon-base font-bold uppercase tracking-widest leading-none">
                  Ajustes
                </span>
              </button>

              <button
                onClick={logout}
                className="w-full px-6 py-4 flex items-center gap-3 hover:bg-rose-50/50 text-rose-600 transition-colors text-left border-none bg-transparent cursor-pointer"
              >
                <LogOut size={14} />
                <span className="text-archon-base font-bold uppercase tracking-widest leading-none">
                  Desconexión
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchonTopBar;

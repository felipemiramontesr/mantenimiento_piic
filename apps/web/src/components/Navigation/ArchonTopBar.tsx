import React, { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

/**
 * 🔱 Archon Component: ArchonTopBar
 * Implementation: Universal Identity Orchestration
 * Aesthetic: Sovereign Minimalism with Premium Dropdowns
 * v.20.0.0
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

  // Close menu when clicking outside (UX standard)
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
    // Resolve relative paths against API base URL from client configuration
    const baseUrl = (api.defaults.baseURL || '').replace(/\/+$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const fullImageUrl = resolveImageUrl(currentUser?.imageUrl);

  return (
    <div className="fixed top-0 right-0 p-24 z-[100] flex items-center gap-24 pointer-events-none">
      <div className="flex items-center gap-24 pointer-events-auto" ref={menuRef}>
        <h1 className="text-[#0f2a44] font-black text-2xl tracking-tighter hidden md:block opacity-90">
          {currentUser?.username || 'Soberano'}
        </h1>

        <div className="relative">
          <button
            onClick={toggleMenu}
            className={`
              w-[57px] h-[57px] rounded-[4px] flex items-center justify-center transition-all duration-300 overflow-hidden border-transparent
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
                  target.src = ''; // Fallback logic
                }}
              />
            ) : (
              <div className="w-full h-full bg-[#0f2a44] flex items-center justify-center text-[#f2b705]">
                <UserIcon size={20} />
              </div>
            )}
          </button>

          {isMenuOpen && (
            <div className="absolute top-[48px] right-0 w-[180px] bg-white rounded-[4px] shadow-[0_10px_40px_rgba(15,42,68,0.12)] py-4 animate-in fade-in slide-in-from-top-1 duration-200">
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
                <span className="text-[10px] font-bold uppercase tracking-widest">Desconexión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchonTopBar;

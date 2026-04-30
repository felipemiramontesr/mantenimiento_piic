import React, { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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

  return (
    <div className="fixed top-0 right-0 p-24 z-[100] flex items-center gap-24 pointer-events-none">
      <div className="flex items-center gap-24 pointer-events-auto" ref={menuRef}>
        <h1 className="text-[#0f2a44] font-black text-2xl tracking-tighter hidden md:block opacity-90">
          Archon
        </h1>

        <div className="relative">
          <button
            onClick={toggleMenu}
            className={`
              w-[44px] h-[44px] rounded-[4px] border-2 flex items-center justify-center transition-all duration-300 overflow-hidden
              ${
                isMenuOpen
                  ? 'border-[#f2b705] bg-[#0f2a44] scale-95 shadow-[0_0_20px_rgba(242,183,5,0.3)]'
                  : 'border-[#0f2a44]/10 bg-white hover:border-[#f2b705] hover:shadow-lg'
              }
            `}
          >
            {currentUser?.imageUrl ? (
              <img
                src={currentUser.imageUrl}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e): void => {
                  const target = e.target as HTMLImageElement;
                  // eslint-disable-next-line no-param-reassign
                  target.src = ''; // Fallback logic
                }}
              />
            ) : (
              <div className="text-[#f2b705]">
                <svg width="24" height="24" viewBox="0 0 100 100">
                  <path
                    d="M50 8L86.5 29V71L50 92L13.5 71V29L50 8Z"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill={isMenuOpen ? 'currentColor' : 'none'}
                    className="transition-all duration-300"
                  />
                </svg>
              </div>
            )}
          </button>

          {isMenuOpen && (
            <div className="absolute top-[52px] right-0 w-[240px] bg-white rounded-[4px] shadow-[0_20px_50px_rgba(15,42,68,0.2)] border border-[#0f2a44]/5 py-12 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
              <div className="px-20 py-16 border-b border-[#0f2a44]/5 mb-8 bg-gray-50/50">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0f2a44]/40 mb-4">
                  Identidad Autenticada
                </p>
                <div className="flex items-center gap-12">
                  <div className="w-32 h-32 rounded-full bg-[#0f2a44] flex items-center justify-center overflow-hidden border border-[#f2b705]/30">
                    {currentUser?.imageUrl ? (
                      <img
                        src={currentUser.imageUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon size={16} className="text-[#f2b705]" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-[12px] font-black text-[#0f2a44] truncate uppercase tracking-tight">
                      {currentUser?.fullName || currentUser?.username}
                    </p>
                    <p className="text-[10px] font-bold text-[#0f2a44]/50 truncate">
                      {currentUser?.role?.name || 'Usuario'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-8 space-y-2">
                <button
                  onClick={handleSettings}
                  className="w-full px-12 py-10 flex items-center gap-12 hover:bg-[#f2b705]/10 text-[#0f2a44] transition-all rounded-[2px] group"
                >
                  <Settings
                    size={16}
                    className="text-[#f2b705] group-hover:rotate-90 transition-transform duration-500"
                  />
                  <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                    Ajustes de Perfil
                  </span>
                </button>

                <button
                  onClick={logout}
                  className="w-full px-12 py-10 flex items-center gap-12 hover:bg-rose-50 text-rose-600 transition-all rounded-[2px] group"
                >
                  <LogOut
                    size={16}
                    className="group-hover:translate-x-1 transition-transform duration-300"
                  />
                  <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                    Cerrar Sesión
                  </span>
                </button>
              </div>

              <div className="mt-12 pt-12 border-t border-[#0f2a44]/5 px-20">
                <p className="text-[8px] font-bold text-[#0f2a44]/20 uppercase tracking-[0.3em] text-center">
                  Archon Sovereign Node v.20.0
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchonTopBar;

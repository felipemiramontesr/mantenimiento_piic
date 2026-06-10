import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, LogOut, User as UserIcon, Bell, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import useNotifications from '../../hooks/useNotifications';
import { acceptMaintenance, rejectMaintenance } from '../../api/maintenance';
import type { SystemNotification } from '../../types/notifications';

const ArchonTopBar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, loading, refresh, markAsRead, markAllRead } =
    useNotifications();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellOpen = (): void => {
    const opening = !isBellOpen;
    setIsBellOpen(opening);
    setIsMenuOpen(false);
    if (opening && unreadCount > 0) {
      markAllRead();
    }
  };

  const handleMenuOpen = (): void => {
    setIsMenuOpen(!isMenuOpen);
    setIsBellOpen(false);
  };

  const handleSettings = (): void => {
    setIsMenuOpen(false);
    navigate('/dashboard/settings');
  };

  const handleAccept = useCallback(
    async (notif: SystemNotification): Promise<void> => {
      const uuid = notif.metadata?.uuid as string | undefined;
      if (!uuid) return;
      setActionLoading(notif.id);
      try {
        await acceptMaintenance(uuid);
        await markAsRead(notif.id);
        await refresh();
        navigate('/dashboard/maintenance');
      } catch {
        // silent
      } finally {
        setActionLoading(null);
      }
    },
    [markAsRead, refresh, navigate]
  );

  const handleReject = useCallback(
    async (notif: SystemNotification): Promise<void> => {
      const uuid = notif.metadata?.uuid as string | undefined;
      if (!uuid) return;
      setActionLoading(notif.id);
      try {
        await rejectMaintenance(uuid);
        await markAsRead(notif.id);
        await refresh();
      } catch {
        // silent
      } finally {
        setActionLoading(null);
      }
    },
    [markAsRead, refresh]
  );

  const resolveImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const baseUrl = (api.defaults.baseURL || '').replace(/\/+$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const fullImageUrl = resolveImageUrl(currentUser?.imageUrl);
  const visibleNotifications = notifications.slice(0, 5);

  return (
    <div className="fixed top-0 right-0 p-6 md:p-10 z-[100] flex items-center gap-6 pointer-events-none">
      <div className="flex items-center gap-4 pointer-events-auto">
        <h1 className="text-pinnacle-navy font-black text-2xl tracking-tighter hidden md:block opacity-90 leading-none">
          {currentUser?.username || 'Soberano'}
        </h1>

        {/* ─── Bell ─────────────────────────────────────────────────────── */}
        <div className="relative" ref={bellRef}>
          <button
            data-testid="bell-btn"
            onClick={handleBellOpen}
            className={`
              w-[57px] h-[57px] rounded-[4px] flex items-center justify-center transition-all duration-300 border bg-transparent outline-none relative
              ${
                isBellOpen
                  ? 'border-pinnacle-yellow shadow-md'
                  : 'border-transparent hover:border-pinnacle-yellow'
              }
            `}
          >
            <Bell size={20} className="text-pinnacle-navy" />
            {unreadCount > 0 && (
              <span
                data-testid="bell-badge"
                className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white font-black leading-none"
                style={{ fontSize: '9px' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isBellOpen && (
            <div
              data-testid="bell-dropdown"
              className="absolute top-[64px] right-0 w-[320px] bg-white rounded-[4px] shadow-[0_10px_40px_rgba(15,42,68,0.12)] animate-in fade-in slide-in-from-top-1 duration-200 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-archon-base font-black uppercase tracking-widest text-pinnacle-navy">
                  Notificaciones
                </span>
                {loading && (
                  <span className="text-archon-sm text-slate-400 font-bold uppercase tracking-wider">
                    Actualizando...
                  </span>
                )}
              </div>

              {visibleNotifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-archon-sm text-slate-400 font-bold uppercase tracking-widest">
                  Sin notificaciones
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                  {visibleNotifications.map((notif) => (
                    <li
                      key={notif.id}
                      data-testid={`notif-item-${notif.id}`}
                      className={`px-4 py-3 transition-colors ${
                        notif.isRead ? 'bg-white' : 'bg-amber-50/40'
                      }`}
                    >
                      <p className="text-archon-sm font-black text-pinnacle-navy leading-tight">
                        {notif.title}
                      </p>
                      <p className="text-archon-sm text-slate-500 mt-0.5 leading-tight">
                        {notif.message}
                      </p>

                      {notif.type === 'MAINTENANCE_ALERT' &&
                        notif.metadata?.actionRequired === true &&
                        !!(notif.metadata?.uuid as string | undefined) && (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              data-testid={`accept-btn-${notif.id}`}
                              disabled={actionLoading === notif.id}
                              onClick={(): void => {
                                handleAccept(notif);
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-[4px] text-archon-sm font-black uppercase tracking-widest border-none outline-none cursor-pointer transition-colors disabled:opacity-50"
                            >
                              <Check size={11} />
                              Aceptar
                            </button>
                            <button
                              data-testid={`reject-btn-${notif.id}`}
                              disabled={actionLoading === notif.id}
                              onClick={(): void => {
                                handleReject(notif);
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-[4px] text-archon-sm font-black uppercase tracking-widest border-none outline-none cursor-pointer transition-colors disabled:opacity-50"
                            >
                              <X size={11} />
                              Rechazar
                            </button>
                          </div>
                        )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ─── Profile ──────────────────────────────────────────────────── */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={handleMenuOpen}
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

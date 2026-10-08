import React from 'react';
import { RefreshCw } from 'lucide-react';
import usePwaUpdateNotifier from './usePwaUpdateNotifier';

/**
 * FC206 F3 (Escenario 9) — aviso flotante y no destructivo: aparece solo si hay una versión nueva
 * esperando. «Actualizar ahora» activa el service worker nuevo y recarga; «Descartar» lo oculta y la
 * sesión sigue intacta.
 */
export default function PwaUpdateBanner(): React.JSX.Element | null {
  const { needRefresh, update, dismiss } = usePwaUpdateNotifier();
  if (!needRefresh) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="pwa-update-banner"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-wrap items-center gap-3 rounded-[6px] bg-pinnacle-navy px-5 py-3 text-sm text-white shadow-xl max-w-[calc(100vw-2rem)]"
    >
      <RefreshCw size={16} aria-hidden="true" />
      <span className="font-medium">Nueva versión de Archon disponible</span>
      <button
        type="button"
        onClick={update}
        data-testid="pwa-update-now"
        className="rounded-[4px] bg-pinnacle-yellow px-3 py-1 text-xs font-bold uppercase tracking-widest text-pinnacle-navy"
      >
        Actualizar ahora
      </button>
      <button
        type="button"
        onClick={dismiss}
        data-testid="pwa-update-dismiss"
        className="text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white"
      >
        Descartar
      </button>
    </div>
  );
}

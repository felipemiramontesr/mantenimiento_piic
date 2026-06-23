import React, { useState, useCallback, useRef } from 'react';
import { ShieldAlert, X, Loader2 } from 'lucide-react';
import api from '../../api/client';

interface PanicResponse {
  success: boolean;
  panicUuid: string;
  notifiedCount: number;
}

// Generates a short 440Hz beep via Web Audio API
function playSOSBeep(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // AudioContext may be unavailable in test environments
  }
}

const PanicButton: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [notifiedCount, setNotifiedCount] = useState(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerPanic = useCallback(async () => {
    if (status === 'loading' || status === 'sent') return;
    setStatus('loading');

    try {
      const res = await api.post<PanicResponse>('/security/panic', {});
      setNotifiedCount(res.data.notifiedCount);
      setStatus('sent');
      playSOSBeep();

      // Auto-reset after 8s
      resetTimer.current = setTimeout(() => setStatus('idle'), 8000);
    } catch {
      setStatus('error');
      resetTimer.current = setTimeout(() => setStatus('idle'), 5000);
    }
  }, [status]);

  const dismiss = useCallback((): void => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setStatus('idle');
  }, []);

  return (
    <>
      {/* Floating SOS button — mobile-first, fixed bottom-right */}
      <button
        data-testid="panic-button"
        onClick={(): void => {
          triggerPanic().catch(() => undefined);
        }}
        disabled={status === 'loading' || status === 'sent'}
        aria-label="Botón de Pánico SOS"
        className={`
          fixed bottom-20 right-4 z-[200] rounded-full w-14 h-14 flex items-center justify-center
          shadow-lg transition-all duration-200 active:scale-95 focus:outline-none
          ${status === 'sent' ? 'bg-green-600 cursor-default' : ''}
          ${status === 'loading' ? 'bg-red-400 cursor-wait' : ''}
          ${status === 'error' ? 'bg-orange-500 cursor-pointer' : ''}
          ${status === 'idle' ? 'bg-red-600 hover:bg-red-700 cursor-pointer animate-pulse' : ''}
        `}
      >
        {status === 'loading' ? (
          <Loader2 size={24} className="text-white animate-spin" />
        ) : (
          <ShieldAlert size={24} className="text-white" />
        )}
      </button>

      {/* SOS sent banner */}
      {(status === 'sent' || status === 'error') && (
        <div
          data-testid="panic-banner"
          className={`
            fixed bottom-36 right-4 z-[200] rounded-xl px-4 py-3 shadow-xl
            flex items-start gap-3 max-w-[260px] text-white text-sm
            ${status === 'sent' ? 'bg-green-700' : 'bg-orange-600'}
          `}
          role="alert"
          aria-live="assertive"
        >
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5 flex-1">
            {status === 'sent' ? (
              <>
                <p className="font-black text-sm">SOS enviado</p>
                <p className="text-xs text-green-200">
                  {notifiedCount} contacto{notifiedCount !== 1 ? 's' : ''} notificado
                  {notifiedCount !== 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <>
                <p className="font-black text-sm">Error al enviar SOS</p>
                <p className="text-xs text-orange-200">Intente nuevamente</p>
              </>
            )}
          </div>
          <button
            onClick={dismiss}
            data-testid="panic-banner-dismiss"
            aria-label="Cerrar"
            className="text-white/70 hover:text-white shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
};

export default PanicButton;

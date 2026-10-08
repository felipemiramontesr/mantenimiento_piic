import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * FC206 F3 (Escenario 9 · Invariante 4) — la PWA busca una versión nueva cada 30 minutos y cada vez
 * que la pestaña vuelve a estar visible o recupera el foco, y la OFRECE sin recargar: con
 * `registerType: 'prompt'`, el service worker nuevo espera hasta que el usuario elige «Actualizar».
 * Antes (`autoUpdate`) solo se buscaba al cargar la página y una pestaña abierta varios días seguía
 * en la versión vieja (QA-OBS-PWA).
 */

export const PWA_UPDATE_INTERVAL_MS = 30 * 60 * 1000;

/** Revisiones periódicas y al volver a la pestaña; devuelve la limpieza (pruebas y HMR). */
export function startUpdateChecks(
  registration: Pick<ServiceWorkerRegistration, 'update'>,
  win: Window = window,
  doc: Document = document
): () => void {
  const check = (): void => {
    registration.update().catch(() => undefined); // sin red: se reintenta en la siguiente revisión
  };
  const onVisibility = (): void => {
    if (doc.visibilityState === 'visible') check();
  };
  const interval = win.setInterval(check, PWA_UPDATE_INTERVAL_MS);
  doc.addEventListener('visibilitychange', onVisibility);
  win.addEventListener('focus', check);
  return (): void => {
    win.clearInterval(interval);
    doc.removeEventListener('visibilitychange', onVisibility);
    win.removeEventListener('focus', check);
  };
}

export interface PwaUpdateState {
  readonly needRefresh: boolean;
  readonly update: () => void;
  readonly dismiss: () => void;
}

/** Estado del aviso de versión nueva para el banner. */
export default function usePwaUpdateNotifier(): PwaUpdateState {
  const stopChecks = useRef<(() => void) | null>(null);
  useEffect(() => (): void => stopChecks.current?.(), []);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) stopChecks.current = startUpdateChecks(registration);
    },
  });
  return {
    needRefresh,
    update: (): void => {
      updateServiceWorker(true).catch(() => undefined);
    },
    dismiss: (): void => setNeedRefresh(false),
  };
}

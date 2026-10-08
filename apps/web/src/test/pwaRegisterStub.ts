import type { Dispatch, SetStateAction } from 'react';

/**
 * FC206 F3 — `virtual:pwa-register/react` solo existe dentro de Vite con el plugin PWA. En vitest se
 * resuelve aquí (alias en `test.alias`): sin service worker, nunca hay versión nueva. Las pruebas
 * del aviso mockean el módulo virtual con `vi.mock` para simular una versión en espera.
 */
// eslint-disable-next-line import/prefer-default-export -- replica el export con nombre del módulo virtual
export function useRegisterSW(): {
  needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
  offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
} {
  const noop = (): void => undefined;
  return {
    needRefresh: [false, noop],
    offlineReady: [false, noop],
    updateServiceWorker: (): Promise<void> => Promise.resolve(),
  };
}

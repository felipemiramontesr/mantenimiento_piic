import React, { useCallback } from 'react';
import { UserIndustrial } from '../types/user';
import { clearToken } from '../api/tokenStore';
import restoreSession from './sessionRestore';
import useSessionBroadcast, { SessionBroadcastEventType } from './useSessionBroadcast';

/** LOGOUT recibido de otra pestaña: mismo efecto local que `logout()` MENOS `POST /auth/logout`
 *  (la pestaña origen ya lo hizo — Scenario 1 del FC, "sin duplicar la petición de red"). */
function applyRemoteLogout(
  setCurrentUser: (user: UserIndustrial | null) => void,
  setIsAuthenticated: (value: boolean) => void
): void {
  clearToken();
  setCurrentUser(null);
  setIsAuthenticated(false);
  window.location.href = '/login';
}

/** LOGIN recibido de otra pestaña: re-deriva el usuario vía el MISMO `restoreSession` con guard
 *  de epoch que ya usa el montaje (FC070) — cero guard nuevo, cero segunda fuente de verdad. El
 *  `setIsLoading` no-op es deliberado: este flujo no debe tocar el spinner de arranque de la app,
 *  solo el estado de sesión (Cond.R-184 R2). */
function applyRemoteLogin(
  sessionEpochRef: React.MutableRefObject<number>,
  setCurrentUser: (user: UserIndustrial | null) => void,
  setIsAuthenticated: (value: boolean) => void
): void {
  const epochAtStart = sessionEpochRef.current;
  restoreSession(sessionEpochRef, epochAtStart, setCurrentUser, setIsAuthenticated, () => {});
}

/** FC184 F1 — Cross_Tab_Session_Sync_BroadcastChannel. Envuelve `useSessionBroadcast` con la
 *  reacción concreta de Archon a un evento remoto, integrada con `sessionEpochRef` (FC070): cada
 *  evento remoto cuenta como una acción de sesión nueva, así que invalida cualquier
 *  `restoreSession` local en vuelo antes de actuar. Devuelve `broadcast` para que
 *  `login()`/`logout()` locales notifiquen a las demás pestañas. */
export default function useCrossTabSessionSync(
  sessionEpochRef: React.MutableRefObject<number>,
  bumpEpoch: () => void,
  setCurrentUser: (user: UserIndustrial | null) => void,
  setIsAuthenticated: (value: boolean) => void
): (type: SessionBroadcastEventType) => void {
  const handleRemoteEvent = useCallback(
    (type: SessionBroadcastEventType): void => {
      bumpEpoch();
      if (type === 'LOGOUT') {
        applyRemoteLogout(setCurrentUser, setIsAuthenticated);
      } else {
        applyRemoteLogin(sessionEpochRef, setCurrentUser, setIsAuthenticated);
      }
    },
    [sessionEpochRef, bumpEpoch, setCurrentUser, setIsAuthenticated]
  );

  return useSessionBroadcast(handleRemoteEvent);
}

import React from 'react';
import { UserIndustrial } from '../types/user';
import api from '../api/client';
import { setToken, clearToken } from '../api/tokenStore';

/** FC 070 mount-time session restore, extraído de `AuthContext.tsx` (FC184 F1) para que
 *  `useCrossTabSessionSync` pueda reusar EXACTAMENTE el mismo guard de epoch al reaccionar a un
 *  evento `LOGIN` de otra pestaña, en vez de duplicar la lógica de carrera (Cond.R-184 R2). Mismo
 *  comportamiento verbatim que la versión que vivía dentro de `AuthContext.tsx`. */
export default async function restoreSession(
  sessionEpochRef: React.MutableRefObject<number>,
  epochAtStart: number,
  setCurrentUser: (user: UserIndustrial | null) => void,
  setIsAuthenticated: (value: boolean) => void,
  setIsLoading: (value: boolean) => void
): Promise<void> {
  try {
    const response = await api.post<{ success: boolean; token: string; user: UserIndustrial }>(
      '/auth/refresh'
    );
    if (sessionEpochRef.current !== epochAtStart) return; // stale — T1 ⊥*
    if (response.data.success) {
      setToken(response.data.token);
      setCurrentUser(response.data.user);
      setIsAuthenticated(true);
    }
  } catch {
    if (sessionEpochRef.current !== epochAtStart) return; // stale — T1 ⊥*
    // No valid refresh token — stay unauthenticated
    clearToken();
    setIsAuthenticated(false);
  } finally {
    setIsLoading(false);
  }
}

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserIndustrial } from '../types/user';
import api from '../api/client';
import { setToken, clearToken } from '../api/tokenStore';

/**
 * 🔱 Archon Context: AuthContext
 * Implementation: Sovereign Session Orchestration
 * v.3.0.0 - JWT httpOnly Cookie + In-Memory Access Token
 */

interface AuthContextType {
  currentUser: UserIndustrial | null;
  effectiveUser: UserIndustrial | null;
  isImpersonating: boolean;
  isLoading: boolean;
  login: (token: string, user: UserIndustrial) => void;
  logout: () => Promise<void>;
  updateCurrentUser: (data: Partial<UserIndustrial>) => void;
  isAuthenticated: boolean;
  startImpersonation: (target: UserIndustrial) => void;
  stopImpersonation: () => void;
  ownerType: 'FLOTILLA' | 'ARCHONAUT' | null;
  /** FC 094 F4/I10/ADR-007 — the single session-race guard (FC070). Any async
   * flow that can outlive a login/logout must capture this before awaiting
   * and compare after resolving, discarding a stale result if it moved.
   * Reads `sessionEpochRef.current` fresh each call — never build a second,
   * competing guard. */
  getSessionEpoch: () => number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** FC 070 mount-time session restore, extracted out of `AuthProvider` to keep
 * it under Gate 2's maxFnLoc budget (FC094 F1) — same epoch-guard behavior
 * verbatim, just called from a `useEffect(() => {...}, [])` instead of
 * defined inline inside one. */
async function restoreSession(
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

/** `login`/`logout`, extracted out of `AuthProvider` alongside `restoreSession`
 * to keep it under Gate 2's maxFnLoc budget (FC094 F1) — same epoch-bump
 * behavior verbatim, just built once per render instead of defined inline. */
function createSessionActions(
  bumpEpoch: () => void,
  setCurrentUser: (user: UserIndustrial | null) => void,
  setIsAuthenticated: (value: boolean) => void
): {
  login: (token: string, user: UserIndustrial) => void;
  logout: () => Promise<void>;
} {
  const login = (token: string, user: UserIndustrial): void => {
    bumpEpoch();
    setToken(token);
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const logout = async (): Promise<void> => {
    bumpEpoch();
    try {
      await api.post('/auth/logout');
    } catch {
      // best-effort — clear local state regardless
    }
    clearToken();
    setCurrentUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  return { login, logout };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserIndustrial | null>(null);
  const [viewAsUser, setViewAsUser] = useState<UserIndustrial | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // FC 082 F3b — ownerType re-derivado server-side desde tenants.owner_type_id
  // (089_AN §9.3); pasa tal cual desde la respuesta de login/refresh/me.
  const ownerType: 'FLOTILLA' | 'ARCHONAUT' | null = currentUser?.ownerType ?? null;

  const isImpersonating = viewAsUser !== null;
  const effectiveUser = viewAsUser ?? currentUser;

  // FC 070 — Auth_Session_Restore_Race_Guard. Contador de generación: cada
  // login/logout manual avanza el epoch. La restauración silenciosa de sesión
  // al montar (restoreSession, más abajo) captura el epoch vigente al iniciar
  // y descarta su resultado — éxito o fallo, T1 — si el epoch ya avanzó
  // cuando resuelve (una acción manual más reciente ya definió el estado).
  const sessionEpochRef = useRef(0);

  const startImpersonation = (target: UserIndustrial): void => setViewAsUser(target);

  const stopImpersonation = (): void => setViewAsUser(null);

  const getSessionEpoch = (): number => sessionEpochRef.current;

  const bumpEpoch = (): void => {
    sessionEpochRef.current += 1;
  };

  const { login, logout } = createSessionActions(bumpEpoch, setCurrentUser, setIsAuthenticated);

  useEffect(() => {
    const epochAtStart = sessionEpochRef.current;
    restoreSession(sessionEpochRef, epochAtStart, setCurrentUser, setIsAuthenticated, setIsLoading);
  }, []);

  const updateCurrentUser = (data: Partial<UserIndustrial>): void => {
    if (currentUser) {
      const updated = { ...currentUser, ...data };
      setCurrentUser(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        effectiveUser,
        isImpersonating,
        isLoading,
        login,
        logout,
        updateCurrentUser,
        isAuthenticated,
        startImpersonation,
        stopImpersonation,
        ownerType,
        getSessionEpoch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

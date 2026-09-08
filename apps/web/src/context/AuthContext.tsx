import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
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

/** Sesión: epoch ref + acciones estables (impersonation/login/logout/
 * updateCurrentUser) — extraída de `AuthProvider` para respetar el cap de 50
 * líneas de Gate 2 (FC166 Track D); mismo comportamiento verbatim, incluye
 * el guard R-L-CONTEXT de epoch (FC 070) y el S6481 de `login`/`logout`. */
function useAuthSessionActions(
  setCurrentUser: React.Dispatch<React.SetStateAction<UserIndustrial | null>>,
  setIsAuthenticated: (value: boolean) => void,
  setViewAsUser: (user: UserIndustrial | null) => void
): {
  sessionEpochRef: React.MutableRefObject<number>;
  startImpersonation: (target: UserIndustrial) => void;
  stopImpersonation: () => void;
  getSessionEpoch: () => number;
  login: (token: string, user: UserIndustrial) => void;
  logout: () => Promise<void>;
  updateCurrentUser: (data: Partial<UserIndustrial>) => void;
} {
  // FC 070 — Auth_Session_Restore_Race_Guard. Contador de generación: cada
  // login/logout manual avanza el epoch. La restauración silenciosa de sesión
  // al montar (restoreSession, en AuthProvider) captura el epoch vigente al
  // iniciar y descarta su resultado — éxito o fallo, T1 — si el epoch ya
  // avanzó cuando resuelve (una acción manual más reciente ya definió el
  // estado).
  const sessionEpochRef = useRef(0);

  const startImpersonation = useCallback(
    (target: UserIndustrial): void => setViewAsUser(target),
    [setViewAsUser]
  );
  const stopImpersonation = useCallback((): void => setViewAsUser(null), [setViewAsUser]);
  const getSessionEpoch = useCallback((): number => sessionEpochRef.current, []);
  const bumpEpoch = useCallback((): void => {
    sessionEpochRef.current += 1;
  }, []);

  // FC166 Track D (S6481) — `bumpEpoch` ya es estable (useCallback []), y
  // setCurrentUser/setIsAuthenticated son estables por contrato de React
  // (useState), así que memoizar aquí mantiene `login`/`logout` con la misma
  // identidad entre renders (antes se recreaban en cada uno).
  const { login, logout } = useMemo(
    () => createSessionActions(bumpEpoch, setCurrentUser, setIsAuthenticated),
    [bumpEpoch, setCurrentUser, setIsAuthenticated]
  );

  // Forma funcional: evita depender de `currentUser` en el useCallback (deja
  // `updateCurrentUser` con identidad estable) preservando el no-op original
  // cuando no hay usuario — React se abstiene de re-renderizar si el updater
  // regresa la misma referencia (`prev`).
  const updateCurrentUser = useCallback(
    (data: Partial<UserIndustrial>): void => {
      setCurrentUser((prev) => (prev ? { ...prev, ...data } : prev));
    },
    [setCurrentUser]
  );

  return {
    sessionEpochRef,
    startImpersonation,
    stopImpersonation,
    getSessionEpoch,
    login,
    logout,
    updateCurrentUser,
  };
}

/** Memoiza el objeto `value` del Provider — extraída de `AuthProvider` para
 * respetar el cap de 50 líneas de Gate 2 (FC166 Track D); mismo
 * comportamiento verbatim (S6481: solo recalcula cuando cambia un valor
 * real). */
function useAuthContextValue(value: AuthContextType): AuthContextType {
  const {
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
  } = value;
  return useMemo<AuthContextType>(
    () => ({
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
    }),
    [
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
    ]
  );
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

  const {
    sessionEpochRef,
    startImpersonation,
    stopImpersonation,
    getSessionEpoch,
    login,
    logout,
    updateCurrentUser,
  } = useAuthSessionActions(setCurrentUser, setIsAuthenticated, setViewAsUser);

  useEffect(() => {
    const epochAtStart = sessionEpochRef.current;
    restoreSession(sessionEpochRef, epochAtStart, setCurrentUser, setIsAuthenticated, setIsLoading);
  }, [sessionEpochRef]);

  const contextValue = useAuthContextValue({
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
  });

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

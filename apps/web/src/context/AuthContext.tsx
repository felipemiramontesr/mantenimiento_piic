/* eslint-disable no-console */
import React, { createContext, useContext, useState, useEffect } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserIndustrial | null>(null);
  const [viewAsUser, setViewAsUser] = useState<UserIndustrial | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isImpersonating = viewAsUser !== null;
  const effectiveUser = viewAsUser ?? currentUser;

  const startImpersonation = (target: UserIndustrial): void => {
    setViewAsUser(target);
  };

  const stopImpersonation = (): void => {
    setViewAsUser(null);
  };

  const logout = async (): Promise<void> => {
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

  const login = (token: string, user: UserIndustrial): void => {
    setToken(token);
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    const restoreSession = async (): Promise<void> => {
      try {
        const response = await api.post<{ success: boolean; token: string; user: UserIndustrial }>(
          '/auth/refresh'
        );
        if (response.data.success) {
          setToken(response.data.token);
          setCurrentUser(response.data.user);
          setIsAuthenticated(true);
        }
      } catch {
        // No valid refresh token — stay unauthenticated
        clearToken();
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
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

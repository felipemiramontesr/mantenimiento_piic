import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserIndustrial } from '../types/user';

/**
 * 🔱 Archon Context: AuthContext
 * Implementation: Sovereign Session Orchestration
 * v.2.0.0 - Hardened Identity & Guarded Hydration
 */

interface AuthContextType {
  currentUser: UserIndustrial | null;
  login: (token: string, user: UserIndustrial) => void;
  logout: () => void;
  updateCurrentUser: (data: Partial<UserIndustrial>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserIndustrial | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem('auth_token')
  );

  const logout = (): void => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setCurrentUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const login = (token: string, user: UserIndustrial): void => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        // 🛡️ Integrity Check: If session is legacy (shallow), purge it
        if (!parsed.roleName || !parsed.username) {
          // eslint-disable-next-line no-console
          console.warn('⚠️ [Archon Auth] Shallow session detected. Purging for restoration.');
          logout();
          return;
        }
        setCurrentUser(parsed);
      } catch (err) {
        logout();
      }
    }
  }, []);

  const updateCurrentUser = (data: Partial<UserIndustrial>): void => {
    if (currentUser) {
      const updated = { ...currentUser, ...data };
      setCurrentUser(updated);
      localStorage.setItem('user_data', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, login, logout, updateCurrentUser, isAuthenticated }}
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

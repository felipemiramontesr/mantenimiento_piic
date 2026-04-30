import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserIndustrial } from '../types/user';

/**
 * 🔱 Archon Context: AuthContext
 * Implementation: Sovereign Session Orchestration
 * v.1.0.0 - Centralized Identity & Access Management
 */

interface AuthContextType {
  currentUser: UserIndustrial | null;
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

  useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (err) {
        localStorage.removeItem('user_data');
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
      }
    }
  }, []);

  const logout = (): void => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setCurrentUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const updateCurrentUser = (data: Partial<UserIndustrial>): void => {
    if (currentUser) {
      const updated = { ...currentUser, ...data };
      setCurrentUser(updated);
      localStorage.setItem('user_data', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, logout, updateCurrentUser, isAuthenticated }}>
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

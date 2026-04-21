import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserIndustrial, UserPanel } from '../types/user';
import api from '../api/client';

/**
 * 🔱 Archon Context: UserContext
 * Implementation: Sentinel Operational Standard (Axios-based)
 * v.28.23.1 - Identity Orchestration (Sovereign API Sync)
 */

interface UserContextType {
  users: UserIndustrial[];
  isLoading: boolean;
  activePanel: UserPanel;
  setActivePanel: (panel: UserPanel) => void;
  fetchUsers: () => Promise<void>;
  toggleUserStatus: (id: string, currentStatus: boolean) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}): React.JSX.Element => {
  const [users, setUsers] = useState<UserIndustrial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<UserPanel>('DIRECTORY');

  const fetchUsers = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Fetch users via the official Archon API Gateway
      const response = await api.get('/users');

      if (response.data.success) {
        setUsers(response.data.data || []);
      }
    } catch (err: unknown) {
      // Silently handle error as per Zero-Noise policy
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleUserStatus = async (id: string, currentStatus: boolean): Promise<void> => {
    try {
      // Use the standard PATCH protocol for state modification
      const response = await api.patch(`/users/${id}`, { is_active: !currentStatus });

      if (response.data.success) {
        await fetchUsers();
      }
    } catch (err: unknown) {
      // Silently handle error
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <UserContext.Provider
      value={{
        users,
        isLoading,
        activePanel,
        setActivePanel,
        fetchUsers,
        toggleUserStatus,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUsers = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserIndustrial, UserPanel } from '../types/user';
import api from '../api/client';

/**
 * 🔱 Archon Context: UserContext
 * Implementation: Sentinel Operational Standard (Axios-based)
 * v.28.23.6 - Identity Orchestration (Sovereign API Sync & CamelCase Mapping)
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
      // Fetch users via the official Archon Auth Gateway
      const response = await api.get('/auth/users');

      if (response.data.success) {
        // Map backend schema (underscores) to Frontend Industrial Schema (camelCase)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedUsers = response.data.data.map(
          (u: any): UserIndustrial => ({
            id: String(u.id),
            username: u.username,
            fullName: u.full_name || u.fullName,
            email: u.email,
            roleId: u.roleId,
            department: u.department,
            employeeNumber: u.employee_number || u.employeeNumber,
            is_active: Boolean(u.is_active),
            role: {
              id: u.roleId,
              name: u.roleName,
            },
          })
        );
        setUsers(mappedUsers);
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
      const response = await api.patch(`/auth/users/${id}`, { is_active: !currentStatus });

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

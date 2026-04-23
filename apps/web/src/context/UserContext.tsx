import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserIndustrial, UserPanel } from '../types/user';
import { DEPARTAMENTOS } from '../constants/fleetConstants';
import { archonCache } from '../utils/archonCache';
import api from '../api/client';

/**
 * 🔱 Archon Context: UserContext
 * Implementation: Sentinel Operational Standard (Axios-based)
 * v.28.23.7 - Identity Orchestration (Strict Typing & API Sync)
 */

interface RawUserResponse {
  id: number;
  username: string;
  full_name?: string;
  fullName?: string;
  email: string;
  roleId: number;
  roleName: string;
  department: string;
  employee_number?: string;
  employeeNumber?: string;
  is_active: number | boolean;
  image_url?: string;
}

interface CatalogOption {
  id: number;
  label: string;
}

interface UserContextType {
  users: UserIndustrial[];
  isLoading: boolean;
  activePanel: UserPanel;
  setActivePanel: (panel: UserPanel) => void;
  fetchUsers: () => Promise<void>;
  toggleUserStatus: (id: string, currentStatus: boolean) => Promise<void>;
  updateUser: (id: string, data: Partial<UserIndustrial>) => Promise<boolean>;
  editingUser: UserIndustrial | null;
  setEditingUser: (user: UserIndustrial | null) => void;
  departments: string[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}): React.JSX.Element => {
  const [users, setUsers] = useState<UserIndustrial[]>(
    () =>
      // Initial hydration from Persistent Cache
      archonCache.get<UserIndustrial[]>('users_directory') || []
  );
  const [isLoading, setIsLoading] = useState(!users.length);
  const [activePanel, setActivePanel] = useState<UserPanel>('DIRECTORY');
  const [editingUser, setEditingUser] = useState<UserIndustrial | null>(null);
  const [departments, setDepartments] = useState<string[]>(
    () => archonCache.get<string[]>('system_departments') || []
  );

  const fetchUsers = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Fetch users via the official Archon Auth Gateway
      const response = await api.get('/auth/users');

      if (response.data.success) {
        // Map backend schema to Frontend Industrial Schema with Strict Typing
        const mappedUsers = (response.data.data as RawUserResponse[]).map(
          (u): UserIndustrial => ({
            id: String(u.id),
            username: u.username,
            fullName: u.full_name || u.fullName || '',
            email: u.email,
            roleId: u.roleId,
            department: u.department,
            employeeNumber: u.employee_number || u.employeeNumber || '',
            is_active: Boolean(u.is_active),
            imageUrl: u.image_url || '',
            role: {
              id: u.roleId,
              name: u.roleName,
            },
          })
        );
        setUsers(mappedUsers);
        // Commit to Persistent Cache
        archonCache.set('users_directory', mappedUsers);
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

  const updateUser = async (id: string, data: Partial<UserIndustrial>): Promise<boolean> => {
    try {
      // Map frontend update to backend schema (CamelCase Sync v.28.40.0)
      const backendData = {
        fullName: data.fullName,
        email: data.email,
        roleId: data.roleId,
        department: data.department,
        employeeNumber: data.employeeNumber,
        image_url: data.imageUrl,
        password: data.password,
      };

      const response = await api.patch(`/auth/users/${id}`, backendData);

      if (response.data.success) {
        await fetchUsers();
        return true;
      }
      return false;
    } catch (err: unknown) {
      return false;
    }
  };

  const fetchDepartments = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get('/catalogs/DEPARTMENT');
      if (response.data?.length) {
        const labels = response.data.map((d: CatalogOption) => d.label);
        setDepartments(labels);
        // Commit to Persistent Cache
        archonCache.set('system_departments', labels);
      }
    } catch (err) {
      // Slient fallback
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, [fetchUsers, fetchDepartments]);

  return (
    <UserContext.Provider
      value={{
        users,
        isLoading,
        activePanel,
        setActivePanel,
        fetchUsers,
        toggleUserStatus,
        updateUser,
        editingUser,
        setEditingUser,
        departments: departments.length > 0 ? departments : (DEPARTAMENTOS as unknown as string[]),
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

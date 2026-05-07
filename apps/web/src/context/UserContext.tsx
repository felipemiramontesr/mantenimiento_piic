import React, { createContext, useContext, useState, useMemo } from 'react';
import useSilkHydration from '../hooks/useSilkHydration';
import { UserIndustrial, UserPanel } from '../types/user';
import { DEPARTAMENTOS } from '../constants/fleetConstants';
import api from '../api/client';

/**
 * 🔱 Archon Context: UserContext
 * Architecture: DRY & SOLID (Silk Hydration Standard)
 * v.70.0.0 - Identity Orchestration (Unified Persistence)
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
  profile_picture_url?: string;
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
  updateUser: (id: string, data: Partial<UserIndustrial>, reason: string) => Promise<boolean>;
  deleteUser: (id: string, reason: string) => Promise<boolean>;
  editingUser: UserIndustrial | null;
  setEditingUser: (user: UserIndustrial | null) => void;
  departments: string[];
  roles: CatalogOption[];
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}): React.JSX.Element => {
  // 1. Universal Hydration Layer (DRY)
  const {
    data: users,
    isSyncing: usersSyncing,
    refresh: fetchUsers,
  } = useSilkHydration<UserIndustrial>({
    key: 'users_directory',
    endpoint: '/auth/users',
    transform: (data: RawUserResponse[]) =>
      data.map((u) => ({
        id: String(u.id),
        username: u.username,
        fullName: u.full_name || u.fullName || '',
        email: u.email,
        roleId: u.roleId,
        department: u.department,
        employeeNumber: u.employee_number || u.employeeNumber || '',
        is_active: Boolean(u.is_active),
        imageUrl: u.profile_picture_url || u.image_url || '',
        roleName: u.roleName,
      })),
  });

  const { data: departmentsData, isSyncing: deptsSyncing } = useSilkHydration<CatalogOption>({
    key: 'system_departments',
    endpoint: '/catalogs/DEPARTMENT',
  });

  const { data: rolesData, isSyncing: rolesSyncing } = useSilkHydration<CatalogOption>({
    key: 'system_roles',
    endpoint: '/auth/roles',
  });

  const [activePanel, setActivePanel] = useState<UserPanel>('DIRECTORY');
  const [editingUser, setEditingUser] = useState<UserIndustrial | null>(null);

  const departments = useMemo(() => departmentsData.map((d) => d.label), [departmentsData]);

  const roles = rolesData;
  const isLoading = (usersSyncing || deptsSyncing || rolesSyncing) && !users.length;

  const toggleUserStatus = async (id: string, currentStatus: boolean): Promise<void> => {
    try {
      // Use the standard PATCH protocol for state modification
      const response = await api.patch(`/auth/users/${id}`, {
        data: { is_active: !currentStatus },
        reason: 'Modificación de estatus operativo vía Directorio',
      });

      if (response.data.success) {
        await fetchUsers();
      }
    } catch (err: unknown) {
      // Silently handle error
    }
  };

  const updateUser = async (
    id: string,
    data: Partial<UserIndustrial>,
    reason: string
  ): Promise<boolean> => {
    try {
      // Map frontend update to backend schema (CamelCase Sync v.28.40.0)
      const backendData = {
        fullName: data.fullName,
        email: data.email,
        roleId: data.roleId,
        department: data.department,
        employeeNumber: data.employeeNumber,
        profilePictureUrl: data.imageUrl,
        password: data.password,
      };

      const response = await api.patch(`/auth/users/${id}`, {
        data: backendData,
        reason,
      });

      if (response.data.success) {
        await fetchUsers();
        return true;
      }
      return false;
    } catch (err: unknown) {
      return false;
    }
  };

  const deleteUser = async (id: string, reason: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/auth/users/${id}`, {
        data: { reason },
      });
      if (response.data.success) {
        await fetchUsers();
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

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
        deleteUser,
        editingUser,
        setEditingUser,
        departments: departments.length > 0 ? departments : (DEPARTAMENTOS as unknown as string[]),
        roles,
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

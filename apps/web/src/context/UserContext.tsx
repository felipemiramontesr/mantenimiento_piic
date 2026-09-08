import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
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
  uuid?: string;
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
  /** FC 076 F3 (R4a) — catálogo con ids: /auth/register exige departmentId
   * numérico; enviar el label string se perdía en silencio (Zod-strip). */
  departmentsCatalog: CatalogOption[];
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

// Las secciones de `UserProvider` (hydration/mutaciones/value memo) se
// extraen a hooks de módulo (FC166 Track D — Gate 2 `max-lines-per-function`)
// para que `UserProvider` sea solo la orquestación; mismo comportamiento
// verbatim en cada una, solo el sitio cambió.

/** 1. Universal Hydration Layer (DRY) — directorio de usuarios. */
function useUsersHydration(): {
  users: UserIndustrial[];
  usersSyncing: boolean;
  fetchUsers: () => Promise<void>;
} {
  const usersTransform = useMemo(
    () =>
      (data: unknown): UserIndustrial[] =>
        (data as RawUserResponse[]).map((u) => ({
          id: String(u.id),
          uuid: u.uuid,
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
    []
  );

  const usersOptions = useMemo(
    () => ({
      key: 'users_directory',
      endpoint: '/auth/users',
      transform: usersTransform,
    }),
    [usersTransform]
  );

  const {
    data: users,
    isSyncing: usersSyncing,
    refresh: fetchUsers,
  } = useSilkHydration<UserIndustrial>(usersOptions);

  return { users, usersSyncing, fetchUsers };
}

/** Catálogo de departamentos — extraída del mismo motivo (Gate 2); mismo
 * comportamiento verbatim (fallback a `DEPARTAMENTOS` legacy si el catálogo
 * remoto viene vacío). */
function useDepartmentsHydration(): {
  departmentsData: CatalogOption[];
  departments: string[];
} {
  const departmentsOptions = useMemo(
    () => ({
      key: 'system_departments',
      endpoint: '/catalogs/DEPARTMENT',
    }),
    []
  );

  const { data: departmentsData } = useSilkHydration<CatalogOption>(departmentsOptions);
  const departments = useMemo(() => departmentsData.map((d) => d.label), [departmentsData]);
  const resolvedDepartments = useMemo(
    () => (departments.length > 0 ? departments : (DEPARTAMENTOS as unknown as string[])),
    [departments]
  );

  return { departmentsData, departments: resolvedDepartments };
}

/** Toggle de estatus operativo (activo/inactivo) — extraída del mismo motivo
 * (Gate 2); mismo comportamiento verbatim. */
function useToggleUserStatus(
  fetchUsers: () => Promise<void>
): (id: string, currentStatus: boolean) => Promise<void> {
  return useCallback(
    async (id: string, currentStatus: boolean): Promise<void> => {
      try {
        // Use the standard PATCH protocol for state modification
        const response = await api.patch(`/auth/users/${id}`, {
          data: { is_active: !currentStatus },
          reason: 'Modificación de estatus operativo vía Directorio',
        });

        if (response.data.success) {
          await fetchUsers();
        }
      } catch {
        // Silently handle error
      }
    },
    [fetchUsers]
  );
}

/** Actualización de usuario (PATCH) — extraída del mismo motivo (Gate 2);
 * mismo comportamiento verbatim (mapeo CamelCase Sync v.28.40.0). */
function useUpdateUser(
  fetchUsers: () => Promise<void>
): (id: string, data: Partial<UserIndustrial>, reason: string) => Promise<boolean> {
  return useCallback(
    async (id: string, data: Partial<UserIndustrial>, reason: string): Promise<boolean> => {
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
      } catch {
        return false;
      }
    },
    [fetchUsers]
  );
}

/** Eliminación de usuario — extraída del mismo motivo (Gate 2); mismo
 * comportamiento verbatim. */
function useDeleteUser(
  fetchUsers: () => Promise<void>
): (id: string, reason: string) => Promise<boolean> {
  return useCallback(
    async (id: string, reason: string): Promise<boolean> => {
      try {
        const response = await api.delete(`/auth/users/${id}`, {
          data: { reason },
        });
        if (response.data.success) {
          await fetchUsers();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [fetchUsers]
  );
}

/** Memoiza el objeto `value` del Provider — extraída del mismo motivo (Gate
 * 2); mismo comportamiento verbatim (S6481: solo recalcula cuando cambia un
 * valor real, gracias a que los 3 handlers ya viajan en useCallback). */
function useUserContextValue(value: UserContextType): UserContextType {
  const {
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
    departments,
    departmentsCatalog,
  } = value;
  return useMemo<UserContextType>(
    () => ({
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
      departments,
      departmentsCatalog,
    }),
    [
      users,
      isLoading,
      activePanel,
      fetchUsers,
      toggleUserStatus,
      updateUser,
      deleteUser,
      editingUser,
      departments,
      departmentsCatalog,
    ]
  );
}

/** Orquesta hydration de usuarios/departamentos + mutaciones CRUD +
 * `activePanel`/`editingUser` locales — ver hooks de módulo arriba para cada
 * pieza. */
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}): React.JSX.Element => {
  const { users, usersSyncing, fetchUsers } = useUsersHydration();
  const { departmentsData, departments } = useDepartmentsHydration();

  // FC 082 F3c2 (Cond.2 Bravo) — dropdown de roles legacy retirado junto con
  // /auth/roles (410) y el CRUD de RolesManager. Roles reales se gestionan
  // vía /v1/cosmonauts/roles*.
  const [activePanel, setActivePanel] = useState<UserPanel>('DIRECTORY');
  const [editingUser, setEditingUser] = useState<UserIndustrial | null>(null);

  const isLoading = usersSyncing && !users.length;

  const toggleUserStatus = useToggleUserStatus(fetchUsers);
  const updateUser = useUpdateUser(fetchUsers);
  const deleteUser = useDeleteUser(fetchUsers);

  const contextValue = useUserContextValue({
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
    departments,
    departmentsCatalog: departmentsData,
  });

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
};

export const useUsers = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
};

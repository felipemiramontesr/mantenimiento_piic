import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserIndustrial, UserPanel } from '../types/user';
import { supabase } from '../lib/supabase';

/**
 * 🔱 Archon Context: UserContext
 * Implementation: Sentinel Operational Standard
 * v.28.23.0 - Identity Orchestration
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
      // Fetch users with their role identity
      const { data, error } = await supabase
        .from('users')
        .select(
          `
          *,
          role:roles(*)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: unknown) {
      // Silently handle error as per Zero-Noise policy
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleUserStatus = async (id: string, currentStatus: boolean): Promise<void> => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      await fetchUsers();
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

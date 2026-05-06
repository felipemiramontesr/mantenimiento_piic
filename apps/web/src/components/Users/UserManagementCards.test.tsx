import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UserManagementCards from './UserManagementCards';
import { UserContext } from '../../context/UserContext';

describe('UserManagementCards (Operational Dashboard)', () => {
  const mockSetActivePanel = vi.fn();
  const mockUsers = [
    { id: '1', username: 'admin', fullName: 'Admin', is_active: true, roleName: 'Admin' },
    { id: '2', username: 'op1', fullName: 'Operator 1', is_active: false, roleName: 'Operator' },
  ];

  const contextValue = {
    users: mockUsers,
    isLoading: false,
    activePanel: 'DIRECTORY',
    setActivePanel: mockSetActivePanel,
    fetchUsers: vi.fn(),
    toggleUserStatus: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    editingUser: null,
    setEditingUser: vi.fn(),
    departments: [],
    roles: [],
  };

  it('renders correctly', () => {
    render(
      <UserContext.Provider value={contextValue as any}>
        <UserManagementCards />
      </UserContext.Provider>
    );

    expect(screen.getByText(/Directorio Maestro/i)).toBeDefined();
    expect(screen.getByText(/Alta de Personal/i)).toBeDefined();
  });

  it('navigates to SIGNUP when button is clicked', () => {
    render(
      <UserContext.Provider value={contextValue as any}>
        <UserManagementCards />
      </UserContext.Provider>
    );

    const addBtn = screen.getByText(/Iniciar Registro/i);
    fireEvent.click(addBtn);

    expect(mockSetActivePanel).toHaveBeenCalledWith('SIGNUP');
  });

  it('navigates to DIRECTORY when first card is clicked', () => {
    render(
      <UserContext.Provider value={contextValue as any}>
        <UserManagementCards />
      </UserContext.Provider>
    );

    const dirCard = screen.getByText(/Directorio Maestro/i);
    fireEvent.click(dirCard);

    expect(mockSetActivePanel).toHaveBeenCalledWith('DIRECTORY');
  });
});

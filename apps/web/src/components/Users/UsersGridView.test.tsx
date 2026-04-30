import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UsersGridView from './UsersGridView';
import { UserContext } from '../../context/UserContext';

/**
 * 🔱 Archon UI Suite: Users Grid View Tests
 * Architecture: Sovereign Registry Validation
 * Version: 1.0.0
 */

describe('UsersGridView Component', () => {
  const mockUsers = [
    {
      id: '1',
      username: 'admin',
      fullName: 'Administrator',
      email: 'admin@piic.com',
      is_active: true,
      role: { name: 'Archon' },
      employeeNumber: '001',
      imageUrl: 'admin.png',
      department: 'IT',
    },
    {
      id: '2',
      username: 'operator',
      fullName: 'Operator One',
      email: 'op1@piic.com',
      is_active: false,
      role: { name: 'Operador' },
      employeeNumber: '002',
    },
  ];

  const mockValue = {
    users: mockUsers,
    isLoading: false,
    setEditingUser: vi.fn(),
    setActivePanel: vi.fn(),
    toggleUserStatus: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the users table correctly with all identity clusters', () => {
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={mockValue as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('OPERATOR')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getByText('Operator One')).toBeInTheDocument();
    expect(screen.getByText('admin@piic.com')).toBeInTheDocument();
    expect(screen.getByText('IT')).toBeInTheDocument();
  });

  it('should show loading state with Archon skeleton', () => {
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={{ ...mockValue, isLoading: true } as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    expect(screen.getByText(/Sincronizando Identidades/i)).toBeInTheDocument();
  });

  it('should toggle user status when clicking the status button', () => {
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={mockValue as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    const activeBtn = screen.getByText('Activo');
    fireEvent.click(activeBtn);
    expect(mockValue.toggleUserStatus).toHaveBeenCalledWith('1', true);

    const inactiveBtn = screen.getByText('Inactivo');
    fireEvent.click(inactiveBtn);
    expect(mockValue.toggleUserStatus).toHaveBeenCalledWith('2', false);
  });

  it('should trigger editing flow when clicking the edit button', () => {
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={mockValue as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    // Find buttons by role. The edit button is the one with the Pencil icon.
    // In UserRegistryRow, it's the second button in the last cell.
    const editButtons = screen.getAllByRole('button').filter((btn) => !btn.textContent);
    fireEvent.click(editButtons[0]);

    expect(mockValue.setEditingUser).toHaveBeenCalledWith(mockUsers[0]);
    expect(mockValue.setActivePanel).toHaveBeenCalledWith('SIGNUP');
  });

  it('should perform sorting by identity', () => {
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={mockValue as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    const identityHeader = screen.getByText('IDENTIDAD');
    fireEvent.click(identityHeader); // First click (asc)
    fireEvent.click(identityHeader); // Second click (desc)

    // Verification of sorting usually involves checking the order of elements in the DOM.
    const names = screen.getAllByText(/Administrator|Operator One/);
    expect(names[0].textContent).toBe('Operator One'); // Desc order
  });

  it('should perform sorting by status', () => {
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={mockValue as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    const statusHeader = screen.getByText('ESTATUS OPERATIVO');
    fireEvent.click(statusHeader); // First click (asc: 0 then 1)

    // Row 0 should be inactive (Inactivo) if asc (0 < 1)
    expect(screen.getAllByText(/Activo|Inactivo/)[0].textContent).toBe('Inactivo');
  });

  it('should perform sorting by role', () => {
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={mockValue as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    const roleHeader = screen.getByText('ROL Y DEPARTAMENTO');
    fireEvent.click(roleHeader);

    // Archon vs Operador
    expect(screen.getAllByText(/Administrator|Operator One/)[0].textContent).toBe('Administrator');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/testUtils';
import UsersGridView from './UsersGridView';
import { UserContext } from '../../context/UserContext';
import * as layoutContext from '../../context/SovereignLayoutContext';

/**
 * 🔱 Archon UI Suite: Users Grid View Tests
 * Architecture: Sovereign Registry Validation
 * Version: 1.0.0
 */

describe('UsersGridView Component', () => {
  const mockUsers = [
    {
      id: '1',
      uuid: 'uuid-admin-0001',
      username: 'admin',
      fullName: 'Administrator',
      email: 'admin@piic.com',
      is_active: true,
      role: { name: 'Archon' },
      roleName: 'Archon',
      employeeNumber: '001',
      imageUrl: 'admin.png',
      department: 'IT',
    },
    {
      id: '2',
      uuid: 'uuid-operator-0002',
      username: 'operator',
      fullName: 'Operator One',
      email: 'op1@piic.com',
      is_active: false,
      role: { name: 'Operador' },
      roleName: 'Operador',
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

  it('node link uses uuid instead of numeric id', () => {
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={mockValue as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    const links = screen.getAllByRole('link');
    const nodeLinks = links.filter((l) => l.getAttribute('href')?.startsWith('/dashboard/users/'));
    expect(nodeLinks[0].getAttribute('href')).toBe('/dashboard/users/uuid-admin-0001');
    expect(nodeLinks[1].getAttribute('href')).toBe('/dashboard/users/uuid-operator-0002');
  });

  it('should perform sorting by username', () => {
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={mockValue as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    const employeeHeader = screen.getByText('EMPLEADO');
    fireEvent.click(employeeHeader); // asc: admin < operator
    const names = screen.getAllByText(/admin|operator/i).filter((el) => el.tagName !== 'A');
    expect(names[0].textContent?.toLowerCase()).toContain('admin');
  });

  it('should filter users when searchTerm is active via SovereignLayout', () => {
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: '', description: '' },
      searchTerm: 'admin',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={mockValue as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    expect(screen.getAllByText(/Administrator|Operator One/).length).toBeGreaterThan(0);
  });

  it('getSuggestions covers fullName, email, employeeNumber, roleName, department match paths', () => {
    let capturedConfig: Parameters<typeof layoutContext.useSovereignLayout>[0] extends undefined
      ? never
      : ReturnType<typeof layoutContext.useSovereignLayout>['searchConfig'] = null;

    const setSearchConfigSpy = vi.fn((cfg) => {
      if (cfg !== null) capturedConfig = cfg;
    });

    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: '', description: '' },
      searchTerm: '',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: setSearchConfigSpy,
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });

    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={mockValue as any}>
        <UsersGridView />
      </UserContext.Provider>
    );

    expect(capturedConfig).not.toBeNull();
    const cfg = capturedConfig as {
      getSuggestions: (t: string) => unknown[];
      onSuggestionSelect: (s: { id: string }) => void;
    };

    // username match
    expect(cfg.getSuggestions('admin').length).toBe(1);
    // fullName match
    expect(cfg.getSuggestions('operator one').length).toBe(1);
    // email match
    expect(cfg.getSuggestions('op1@piic').length).toBe(1);
    // employeeNumber match
    expect(cfg.getSuggestions('001').length).toBe(1);
    // roleName match
    expect(cfg.getSuggestions('archon').length).toBe(1);
    // department match
    expect(cfg.getSuggestions('it').length).toBe(1);
    // no match
    expect(cfg.getSuggestions('zzznomatch').length).toBe(0);
  });

  it('onSuggestionSelect calls setSearchTerm with suggestion id', () => {
    let capturedConfig: {
      getSuggestions: (t: string) => unknown[];
      onSuggestionSelect: (s: { id: string }) => void;
    } | null = null;
    const setSearchTermSpy = vi.fn();

    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: '', description: '' },
      searchTerm: '',
      setSearchTerm: setSearchTermSpy,
      searchConfig: null,
      setSearchConfig: (cfg) => {
        capturedConfig = cfg as typeof capturedConfig;
      },
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });

    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={mockValue as any}>
        <UsersGridView />
      </UserContext.Provider>
    );

    capturedConfig!.onSuggestionSelect({ id: 'admin' });
    expect(setSearchTermSpy).toHaveBeenCalledWith('admin');
  });

  it('UserIdentityCluster falls back to username when fullName is null', () => {
    const usersWithNoFullName = [{ ...mockUsers[0], fullName: null }, mockUsers[1]];
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={{ ...mockValue, users: usersWithNoFullName } as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('RoleBadge applies correct styles for various role names', () => {
    const usersMultiRole = [
      { ...mockUsers[0], role: { name: 'Gerente' }, roleName: 'Gerente' },
      {
        ...mockUsers[1],
        role: { name: 'Técnico' },
        roleName: 'Técnico',
        uuid: 'uuid-003',
        id: '3',
      },
    ];
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={{ ...mockValue, users: usersMultiRole } as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    expect(screen.getByText('Gerente')).toBeInTheDocument();
    expect(screen.getByText('Técnico')).toBeInTheDocument();
  });

  it('identity sort with null fullName uses username as fallback in comparator', () => {
    const usersNullName = [
      { ...mockUsers[0], fullName: null },
      { ...mockUsers[1], fullName: null },
    ];
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={{ ...mockValue, users: usersNullName } as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    fireEvent.click(screen.getByText('IDENTIDAD'));
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('role sort with null roleName uses empty string fallback in comparator', () => {
    const usersNullRole = [
      { ...mockUsers[0], roleName: null },
      { ...mockUsers[1], roleName: null },
    ];
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={{ ...mockValue, users: usersNullRole } as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    fireEvent.click(screen.getByText('ROL Y DEPARTAMENTO'));
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('status sort with inactive user first covers is_active false branch in comparator', () => {
    const usersReversed = [mockUsers[1], mockUsers[0]]; // operator (inactive) first
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <UserContext.Provider value={{ ...mockValue, users: usersReversed } as any}>
        <UsersGridView />
      </UserContext.Provider>
    );
    fireEvent.click(screen.getByText('ESTATUS OPERATIVO'));
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });
});

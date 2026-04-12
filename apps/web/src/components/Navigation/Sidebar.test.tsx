import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: (): { pathname: string } => ({ pathname: '/dashboard/fleet' }),
  };
});

describe('Sidebar Component (Archon Core)', () => {
  const navigateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(navigateMock);
    
    Storage.prototype.getItem = vi.fn((key) => {
      if (key === 'user_data') return JSON.stringify({ username: 'Operator' });
      return null;
    });
    Storage.prototype.removeItem = vi.fn();
  });

  it('renders all navigation items properly and respects location', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(screen.getByText(/ARCHON/i)).toBeDefined();
    expect(screen.getByText(/Operator/i)).toBeDefined();
    
    expect(screen.getByText('Command Center')).toBeDefined();
    expect(screen.getByText('Fleet Status')).toBeDefined();
    expect(screen.getByText('Security Logs')).toBeDefined();
    expect(screen.getByText('System Config')).toBeDefined();
  });

  it('navigates when clicking navigation items', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Command Center'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');

    fireEvent.click(screen.getByText('Fleet Status'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/fleet');
    
    fireEvent.click(screen.getByText(/ARCHON/i));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('terminates session on logout click after confirmation', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    // First click: should enter confirmation state
    fireEvent.click(screen.getByText('Terminate Session'));
    expect(screen.getByText('Confirm?')).toBeDefined();
    expect(localStorage.removeItem).not.toHaveBeenCalled();

    // Second click: should actually logout
    fireEvent.click(screen.getByText('Confirm?'));
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('user_data');
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './Login';
import api from '../../api/client';

vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return {
    ...actual,
    useNavigate: (): ReturnType<typeof vi.fn> => mockNavigate,
  };
});

describe('LoginPage Component (ARCHON CORE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = (): ReturnType<typeof render> => render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );

  it('renders login form and inputs correctly', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('ID de Archon')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /acceder al sistema/i })).toBeInTheDocument();
  });

  it('shows cookie banner if cookies_accepted is not set and allows accepting', () => {
    renderComponent();
    const bannerText = screen.getByText(/Utilizamos cookies propias y de terceros/i);
    expect(bannerText).toBeInTheDocument();

    const acceptBtn = screen.getByRole('button', { name: /acePTAR/i });
    fireEvent.click(acceptBtn);

    expect(localStorage.getItem('cookies_accepted')).toBe('true');
    expect(screen.queryByText(/Utilizamos cookies propias y de terceros/i)).not.toBeInTheDocument();
  });

  it('hides cookie banner if cookies_accepted is true or user rejects', () => {
    localStorage.setItem('cookies_accepted', 'true');
    const { unmount } = renderComponent();
    expect(screen.queryByText(/Utilizamos cookies propias y de terceros/i)).not.toBeInTheDocument();
    unmount();

    // Test rejection
    localStorage.clear();
    renderComponent();
    const rejectBtn = screen.getByRole('button', { name: /RECHAZAR/i });
    fireEvent.click(rejectBtn); // Currently sets showCookies(false) but doesn't write to localStorage
    expect(screen.queryByText(/Utilizamos cookies propias y de terceros/i)).not.toBeInTheDocument();
  });

  it('handles successful login and redirects to /dashboard', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        token: 'mock-jwt-token',
        user: { id: 1, username: 'admin' },
      },
    });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('ID de Archon'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /acceder al sistema/i }));

    expect(api.post).toHaveBeenCalledWith('/auth/login', { username: 'admin', password: 'password123' });
    expect(screen.getByRole('button', { name: /autenticando archon/i })).toBeDisabled();

    await waitFor(() => {
      expect(localStorage.getItem('auth_token')).toBe('mock-jwt-token');
      expect(localStorage.getItem('user_data')).toBe(JSON.stringify({ id: 1, username: 'admin' }));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays generic error on 401 Unauthorized', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { status: 401 },
    });

    renderComponent();
    fireEvent.submit(screen.getByRole('button', { name: /acceder al sistema/i })); // Alternatively submit form

    await waitFor(() => {
      expect(screen.getByText(/Credenciales inválidas. Verifique su ID de Archon./i)).toBeInTheDocument();
    });
  });

  it('displays connection error on 500 or network failure', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { status: 500 },
    });

    renderComponent();
    
    // Simulate user typing values
    fireEvent.change(screen.getByPlaceholderText('ID de Archon'), { target: { value: 'user' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /acceder al sistema/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error de conexión. Intente de nuevo más tarde/i)).toBeInTheDocument();
    });
    
    // Verify loaders disable after request
    expect(screen.getByPlaceholderText('ID de Archon')).not.toBeDisabled();
    expect(screen.getByPlaceholderText('••••••••')).not.toBeDisabled();
  });
});

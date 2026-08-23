import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import LoginPage from './pages/Auth/Login';
import { AuthProvider } from './context/AuthContext';
import api from './api/client';
import App from './App';

vi.mock('./api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    defaults: {
      baseURL: 'https://apiv1.piic.com.mx/v1',
    },
  },
}));

// Stubs the full Sidebar/FleetProvider/PanicButton dashboard shell — this
// suite only needs to prove ProtectedRoute renders its children once
// authenticated, not exercise the dashboard chrome itself.
vi.mock('./pages/Dashboard/Layout', () => ({
  default: (): React.ReactElement => <div data-testid="dashboard-shell" />,
}));

describe('PIIC ARCHON - Authentication Interface', () => {
  const renderLogin = (): void => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );
  };

  it('should render the login page correctly', () => {
    renderLogin();

    // Check main title (Auth Card)
    const heading = screen.getByText(/Acceso Archon/i);
    expect(heading).toBeInTheDocument();

    // Check action buttons
    const loginButton = screen.getByRole('button', { name: /Acceder al Sistema/i });
    expect(loginButton).toBeInTheDocument();

    const contactButton = screen.getByText(/Contactar a un asesor/i);
    expect(contactButton).toBeInTheDocument();
  });

  it('should have functional links to PIIC external sites', () => {
    renderLogin();

    const websiteLink = screen.getByText(/Ver sitio Web/i);
    expect(websiteLink).toBeInTheDocument();
    expect(websiteLink.closest('a')).toHaveAttribute('href', 'https://piic.com.mx/');
    expect(websiteLink.closest('a')).toHaveAttribute('target', '_blank');
  });
});

/**
 * FC162 R3-B2 (100% mandatorio, 201_AN) — el `App` real (composición de
 * BrowserRouter/Routes/ProtectedRoute/DashboardChildRoutes) nunca se
 * montaba: el describe de arriba solo renderiza `LoginPage` de forma
 * aislada pese al nombre del archivo. Smoke de composición mínimo:
 * sin sesión, la cadena "/" → "/dashboard" → ProtectedRoute → "/login"
 * debe resolver end-to-end sin mockear el árbol de rutas.
 */
describe('PIIC ARCHON - App (root composition)', () => {
  it('redirects an unauthenticated visitor through / → /dashboard → /login', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Acceso Archon/i)).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe('/login');
  });

  it('renders the protected dashboard shell for an authenticated session', async () => {
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/auth/refresh') {
        return {
          data: {
            success: true,
            token: 'mock-token',
            user: {
              id: '1',
              username: 'archon',
              fullName: 'Archon Master',
              email: 'archon@piic.com.mx',
              roleId: 0,
              roleName: 'Master (Archon)',
              department: 'IT',
              employeeNumber: 'EMP-001',
              is_active: true,
              permissions: ['*'],
            },
          },
        };
      }
      throw new Error(`unmocked: ${url}`);
    });

    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    expect(await screen.findByTestId('dashboard-shell')).toBeInTheDocument();
  });
});

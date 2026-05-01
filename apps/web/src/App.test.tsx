import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import LoginPage from './pages/Auth/Login';
import { AuthProvider } from './context/AuthContext';

vi.mock('./api/client', () => ({
  default: {
    post: vi.fn(),
    defaults: {
      baseURL: 'https://apiv1.piic.com.mx/v1',
    },
  },
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

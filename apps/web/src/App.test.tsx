import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import LoginPage from './pages/Auth/Login';

describe('PIIC ARCHON - Authentication Interface', () => {
  const renderLogin = (): void => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
  };

  it('should render the login page correctly', () => {
    renderLogin();
    
    // Check main title
    const heading = screen.getByText(/Acceso Archon/i);
    expect(heading).toBeInTheDocument();
    
    // Check identity subtitle
    const subtitle = screen.getByText(/Control de Flotas/i);
    expect(subtitle).toBeInTheDocument();

    // Check action buttons
    const loginButton = screen.getByRole('button', { name: /Ingresar/i });
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

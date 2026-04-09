import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './pages/Auth/Login';

describe('PIIC ARCHON - Authentication Interface', () => {
  it('should render the login page correctly', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    
    // Check for specific text from the Login screen
    const heading = screen.getByText(/Acceso Archon/i);
    expect(heading).toBeInTheDocument();
    
    const subtitle = screen.getByText(/Sistema de Mantenimiento Vehicular/i);
    expect(subtitle).toBeInTheDocument();
  });

  it('should have a functional login form', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    
    const usernameInput = screen.getByPlaceholderText(/ID de Archon/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••••••/i);
    const submitButton = screen.getByText(/Iniciar Autenticación/i);
    
    expect(usernameInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
  });
});

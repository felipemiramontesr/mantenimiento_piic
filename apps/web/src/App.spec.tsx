import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mocks to avoid complex rendering of dashboard
vi.mock('./pages/Auth/Login', () => ({
  default: (): React.JSX.Element => <div data-testid="mock-login">Mock Login</div>,
}));

vi.mock('./pages/Dashboard/Layout', () => ({
  default: (): React.JSX.Element => <div data-testid="mock-dashboard">Mock Dashboard</div>,
}));

describe('App Router Component (Sovereign Grid)', () => {
  it('renders the login page by default when unauthenticated', () => {
    localStorage.removeItem('auth_token');
    render(<App />);
    expect(screen.getByTestId('mock-login')).toBeDefined();
  });
});

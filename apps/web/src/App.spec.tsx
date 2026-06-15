import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mocks to avoid complex rendering of dashboard
vi.mock('./pages/Auth/Login', () => ({
  default: (): React.JSX.Element => <div data-testid="mock-login">Mock Login</div>,
}));

vi.mock('./pages/Dashboard/Layout', () => ({
  default: (): React.JSX.Element => <div data-testid="mock-dashboard">Mock Dashboard</div>,
}));

// AuthProvider calls /auth/refresh on mount — reject to simulate no session
vi.mock('./api/client', () => ({
  default: {
    post: vi.fn().mockRejectedValue(new Error('no session')),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), handlers: [] },
      response: { use: vi.fn(), handlers: [] },
    },
  },
}));

describe('App Router Component (Sovereign Grid)', () => {
  it('renders the login page by default when unauthenticated', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('mock-login')).toBeDefined();
    });
  });
});

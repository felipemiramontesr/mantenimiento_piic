import React, { ReactElement } from 'react';
import { render, RenderOptions, renderHook, RenderHookOptions } from '@testing-library/react';
import { UserProvider } from '../context/UserContext';
import { FleetProvider } from '../context/FleetContext';

/**
 * 🔱 Archon Test Utility: Sovereign Provider Wrapper
 * Purpose: Centralizes the context injection for all frontend suites.
 * Architecture: Ensures consistent state across unit and integration tests.
 */
export const AllTheProviders = ({ children }: { children: React.ReactNode }): ReactElement => (
  <UserProvider>
    <FleetProvider>{children}</FleetProvider>
  </UserProvider>
);

const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): ReturnType<typeof render> => render(ui, { wrapper: AllTheProviders, ...options });

const renderHookWithProviders = <Result, Props>(
  renderCallback: (props: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, 'wrapper'>
): ReturnType<typeof renderHook<Result, Props>> =>
  renderHook(renderCallback, { wrapper: AllTheProviders, ...options });

// Re-export everything from RTL
export * from '@testing-library/react';

// Override/Export methods
export { renderWithProviders as render };
export { renderHookWithProviders as renderHook };

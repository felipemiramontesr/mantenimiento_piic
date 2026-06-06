import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SovereignLayoutProvider, useSovereignLayout } from './SovereignLayoutContext';

const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <SovereignLayoutProvider>{children}</SovereignLayoutProvider>
);

describe('SovereignLayoutContext', () => {
  it('initializes with default layout data', () => {
    const { result } = renderHook(() => useSovereignLayout(), { wrapper });
    expect(result.current.layoutData.title).toBe('Sovereign System');
    expect(result.current.layoutData.description).toBe('Industrial Logistics Management Console');
    expect(result.current.searchTerm).toBe('');
    expect(result.current.searchConfig).toBeNull();
    expect(result.current.isMobileMenuOpen).toBe(false);
  });

  it('useSovereignLayout throws when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation((): void => undefined);
    expect(() => renderHook(() => useSovereignLayout())).toThrow(
      'useSovereignLayout must be used within a SovereignLayoutProvider'
    );
    consoleSpy.mockRestore();
  });

  it('setSectionData updates title and description', async () => {
    const { result } = renderHook(() => useSovereignLayout(), { wrapper });
    await act(async () => {
      result.current.setSectionData('Flotilla', 'Control de unidades');
    });
    expect(result.current.layoutData.title).toBe('Flotilla');
    expect(result.current.layoutData.description).toBe('Control de unidades');
  });

  it('setSectionData updates subheaderActions and headerAction', async () => {
    const { result } = renderHook(() => useSovereignLayout(), { wrapper });
    const fakeAction = {
      variant: 'navy' as const,
      headerTitle: 'Prueba',
      HeaderIcon: (): React.JSX.Element => <svg />,
      actionTitle: 'Acción',
      description: 'Descripción',
      PayloadIcon: (): React.JSX.Element => <svg />,
      buttonText: 'Clic',
      isActive: false,
      onClick: vi.fn(),
    };
    const subheaderNode = <span>Sub</span>;
    await act(async () => {
      result.current.setSectionData('Seguridad', 'Logs', subheaderNode, fakeAction);
    });
    expect(result.current.layoutData.title).toBe('Seguridad');
    expect(result.current.layoutData.headerAction).toMatchObject({ headerTitle: 'Prueba' });
    expect(result.current.layoutData.subheaderActions).toBe(subheaderNode);
  });

  it('setSearchTerm updates the search term', async () => {
    const { result } = renderHook(() => useSovereignLayout(), { wrapper });
    await act(async () => {
      result.current.setSearchTerm('ASM-003');
    });
    expect(result.current.searchTerm).toBe('ASM-003');
  });

  it('setSearchConfig stores and clears config', async () => {
    const { result } = renderHook(() => useSovereignLayout(), { wrapper });
    const config = {
      placeholder: 'Buscar...',
      getSuggestions: vi.fn().mockReturnValue([]),
      onSuggestionSelect: vi.fn(),
    };
    await act(async () => {
      result.current.setSearchConfig(config);
    });
    expect(result.current.searchConfig).toBe(config);
    await act(async () => {
      result.current.setSearchConfig(null);
    });
    expect(result.current.searchConfig).toBeNull();
  });

  it('setIsMobileMenuOpen toggles mobile menu state', async () => {
    const { result } = renderHook(() => useSovereignLayout(), { wrapper });
    await act(async () => {
      result.current.setIsMobileMenuOpen(true);
    });
    expect(result.current.isMobileMenuOpen).toBe(true);
    await act(async () => {
      result.current.setIsMobileMenuOpen(false);
    });
    expect(result.current.isMobileMenuOpen).toBe(false);
  });
});

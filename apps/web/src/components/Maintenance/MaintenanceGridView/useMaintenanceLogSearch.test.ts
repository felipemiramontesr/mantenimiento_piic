import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as layoutContext from '../../../context/SovereignLayoutContext';
import { useMaintenanceLogSearch } from './useMaintenanceLogSearch';

/**
 * FC165 F2 Slice 2.1B (refactor pass) — `useMaintenanceLogSearch` is now a
 * small, independently exported hook (moved out of the former god-component
 * during the MaintenanceGridView.tsx decomposition). Per the Boundary
 * Sanitization Pattern's own criterion (Alfa 248_AN / Bravo 249_AN): a
 * function like this that IS exported gets a real unit test for its
 * defensive `(logs || [])` fallback rather than a purge, since a future
 * caller could plausibly pass a non-array `logs` directly to this hook
 * (unlike the fully-internal computeAverages case in FleetContext.tsx).
 */
describe('useMaintenanceLogSearch', () => {
  it('getSuggestions tolerates a non-array logs argument without throwing', () => {
    const setSearchConfig = vi.fn();
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Mantenimiento', description: 'ERP' },
      searchTerm: '',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig,
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });

    renderHook(() => useMaintenanceLogSearch(null as unknown as never[]));

    expect(setSearchConfig).toHaveBeenCalled();
    const { getSuggestions } = setSearchConfig.mock.calls[0][0];
    expect(getSuggestions('anything')).toEqual([]);
  });
});

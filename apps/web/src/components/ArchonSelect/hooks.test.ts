import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { useDropdownPosition } from './hooks';

describe('useDropdownPosition', () => {
  it('updatePosition does nothing when containerRef.current is null', () => {
    const { result } = renderHook(() =>
      useDropdownPosition({ current: null } as RefObject<HTMLDivElement>, false)
    );
    const styleBefore = result.current.dropdownStyle;
    result.current.updatePosition();
    expect(result.current.dropdownStyle).toBe(styleBefore);
  });
});

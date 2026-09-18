import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import useFieldValidity from './useFieldValidity';

describe('useFieldValidity', () => {
  it('refleja el resultado del validador sin importar si el campo fue tocado', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useFieldValidity(value, (v) => v.length > 2),
      {
        initialProps: { value: '' },
      }
    );
    expect(result.current.valid).toBe(false);

    rerender({ value: 'abc' });
    expect(result.current.valid).toBe(true);
  });

  it('touched empieza en false y pasa a true tras markTouched', () => {
    const { result } = renderHook(() =>
      useFieldValidity(
        '',
        vi.fn(() => false)
      )
    );
    expect(result.current.touched).toBe(false);

    act(() => {
      result.current.markTouched();
    });
    expect(result.current.touched).toBe(true);
  });

  it('markTouched es estable entre renders (misma identidad)', () => {
    const { result, rerender } = renderHook(({ value }) => useFieldValidity(value, () => true), {
      initialProps: { value: 'a' },
    });
    const firstMarkTouched = result.current.markTouched;
    rerender({ value: 'b' });
    expect(result.current.markTouched).toBe(firstMarkTouched);
  });
});

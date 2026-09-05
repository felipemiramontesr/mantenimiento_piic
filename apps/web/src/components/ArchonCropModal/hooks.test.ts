import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { useCropConfirm } from './useCropConfirm';
import { useCropWheelZoom } from './useCropWheelZoom';
import { useCropGeometry } from './useCropGeometry';

// jsdom does not implement canvas — provide minimal stubs (mirrors ArchonCropModal.test.tsx)
beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: (): { drawImage: () => void } => ({ drawImage: vi.fn() }),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    value: (): string => 'data:image/jpeg;base64,mock',
    configurable: true,
    writable: true,
  });
});

describe('useCropConfirm', () => {
  it('does nothing when imgRef.current is null', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useCropConfirm({
        imgRef: { current: null } as RefObject<HTMLImageElement>,
        offset: { x: 0, y: 0 },
        scale: 1,
        onConfirm,
      })
    );
    result.current();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does nothing when the canvas 2D context is unavailable', () => {
    const onConfirm = vi.fn();
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValueOnce(null);
    const { result } = renderHook(() =>
      useCropConfirm({
        imgRef: { current: document.createElement('img') } as RefObject<HTMLImageElement>,
        offset: { x: 0, y: 0 },
        scale: 1,
        onConfirm,
      })
    );
    result.current();
    expect(onConfirm).not.toHaveBeenCalled();
    getContextSpy.mockRestore();
  });
});

describe('useCropWheelZoom', () => {
  it('does nothing when containerRef.current is null', () => {
    const applyZoom = vi.fn();
    expect(() =>
      renderHook(() =>
        useCropWheelZoom({
          containerRef: { current: null } as RefObject<HTMLDivElement>,
          scale: 1,
          offset: { x: 0, y: 0 },
          naturalSize: { w: 100, h: 100 },
          applyZoom,
        })
      )
    ).not.toThrow();
    expect(applyZoom).not.toHaveBeenCalled();
  });
});

describe('useCropGeometry', () => {
  it('onImageLoad does nothing when imgRef.current is null', () => {
    const { result } = renderHook(() => useCropGeometry());
    const scaleBefore = result.current.scale;
    result.current.onImageLoad();
    expect(result.current.scale).toBe(scaleBefore);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api from '../api/client';
import { resolveProfileImageUrl, compressImage } from './imageUtils';

/**
 * FC162 F3 — imageUtils.ts had zero test coverage. `resolveProfileImageUrl`
 * is pure string logic with no browser dependency — covered here directly.
 *
 * FC162 R4-C — `compressImage` was deferred to E2E-only because jsdom has no
 * real Canvas 2D backend (no `canvas` npm package installed), so
 * `getContext('2d')` always returns null here. Sonar's coverage measure only
 * reads the Vitest lcov though, so E2E coverage never counted — closed here
 * by mocking `HTMLCanvasElement.prototype.getContext`/`toDataURL` (the
 * orchestration logic — resize math, mime selection, reject paths — is what
 * needs covering, not real pixel rendering) and a controllable fake `Image`
 * (jsdom's real `Image` never fires `onload` for a synthetic data: URL).
 */

describe('resolveProfileImageUrl', () => {
  it('returns an empty string when url is null/undefined', () => {
    expect(resolveProfileImageUrl(null)).toBe('');
    expect(resolveProfileImageUrl(undefined)).toBe('');
  });

  it('passes through absolute http(s) URLs unchanged', () => {
    expect(resolveProfileImageUrl('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png'
    );
  });

  it('passes through data: and blob: URLs unchanged', () => {
    expect(resolveProfileImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(resolveProfileImageUrl('blob:http://localhost/xyz')).toBe('blob:http://localhost/xyz');
  });

  it('builds a /users/:id/profile-image URL when userId is provided', () => {
    const baseUrl = (api.defaults.baseURL || '').replace(/\/+$/, '');
    expect(resolveProfileImageUrl('ignored.png', 42)).toBe(`${baseUrl}/users/42/profile-image`);
  });

  it('joins a relative path to baseUrl when no userId is provided', () => {
    const baseUrl = (api.defaults.baseURL || '').replace(/\/+$/, '');
    expect(resolveProfileImageUrl('/uploads/foo.png')).toBe(`${baseUrl}/uploads/foo.png`);
    expect(resolveProfileImageUrl('uploads/foo.png')).toBe(`${baseUrl}/uploads/foo.png`);
  });
});

describe('compressImage', () => {
  let originalImage: typeof Image;
  let fakeImageConfig: { width: number; height: number; shouldFail: boolean };

  class FakeImage {
    width: number;

    height: number;

    onload: (() => void) | null = null;

    onerror: (() => void) | null = null;

    constructor() {
      this.width = fakeImageConfig.width;
      this.height = fakeImageConfig.height;
    }

    set src(_value: string) {
      queueMicrotask(() => {
        if (fakeImageConfig.shouldFail) {
          this.onerror?.();
        } else {
          this.onload?.();
        }
      });
    }
  }

  const makeFile = (type = 'image/jpeg'): File => new File(['fake-bytes'], 'photo.jpg', { type });

  beforeEach(() => {
    fakeImageConfig = { width: 200, height: 150, shouldFail: false };
    originalImage = global.Image;
    global.Image = FakeImage as unknown as typeof Image;
  });

  afterEach(() => {
    global.Image = originalImage;
    vi.restoreAllMocks();
  });

  it('resolves a compressed base64 + mime for a JPEG under maxDim (no resize)', async () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,xyz'
    );

    const result = await compressImage(makeFile('image/jpeg'));

    expect(result).toEqual({ base64: 'data:image/jpeg;base64,xyz', mime: 'image/jpeg' });
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 200, 150);
  });

  it('preserves the PNG mime type', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,xyz');

    const result = await compressImage(makeFile('image/png'));
    expect(result.mime).toBe('image/png');
  });

  it('downsizes an oversized image while preserving aspect ratio', async () => {
    fakeImageConfig = { width: 1600, height: 800, shouldFail: false };
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,xyz'
    );

    // ratio = min(400/1600, 400/800) = 0.25 -> 1600x800 becomes 400x200
    await compressImage(makeFile('image/jpeg'), 400, 0.8);

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 400, 200);
  });

  it('rejects when Canvas 2D is not supported', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    await expect(compressImage(makeFile())).rejects.toThrow('Canvas 2D not supported');
  });

  it('rejects when the image fails to load', async () => {
    fakeImageConfig.shouldFail = true;

    await expect(compressImage(makeFile())).rejects.toThrow('Failed to load image');
  });
});

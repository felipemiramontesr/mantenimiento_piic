import { describe, it, expect } from 'vitest';
import api from '../api/client';
import { resolveProfileImageUrl } from './imageUtils';

/**
 * FC162 F3 — imageUtils.ts had zero test coverage. `compressImage` needs a
 * real Canvas 2D context (jsdom does not implement one) and stays covered
 * via E2E. `resolveProfileImageUrl` is pure string logic with no browser
 * dependency — covered here directly.
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

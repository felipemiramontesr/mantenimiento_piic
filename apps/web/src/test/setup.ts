/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import '@testing-library/jest-dom';
import React from 'react';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import server from './server';

// 🔱 Polyfills for MSW/Axios (v.17.0.0 CI fix)
if (typeof global.ProgressEvent === 'undefined') {
  (global as any).ProgressEvent = class ProgressEvent extends Event {};
}

// 🔱 scrollIntoView Polyfill for JSDOM
if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

/**
 * 🔱 Archon Test Setup: Vitest Lifecycle Orchestration
 * Silicon Valley Standards (v.17.0.0)
 */

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  // 🔱 Memory Hardening: Force V8 Garbage Collection in forks to reclaim JSDOM allocations
  if (typeof global.gc === 'function') {
    global.gc();
  }
});

// 🔱 React Router Noise Shield (v.7.0.0 Readiness)
/* eslint-disable no-console */
const originalWarn = console.warn;
console.warn = (...args: any[]): void => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('React Router Future Flag')) {
    return;
  }
  originalWarn(...args);
};
/* eslint-enable no-console */

// 🔱 Motion Suppression (v.1.0.0 CI Stability)
// Use a Proxy with cache to handle any motion[tag] automatically with forwardRef support and avoid memory allocation leaks
const mockMotionCache = new Map<string, any>();

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string): any => {
        if (!mockMotionCache.has(tag)) {
          mockMotionCache.set(
            tag,
            React.forwardRef(
              ({ children, ...props }: any, ref: any): React.ReactElement =>
                React.createElement(tag, { ...props, ref }, children)
            )
          );
        }
        return mockMotionCache.get(tag);
      },
    }
  ),
  AnimatePresence: ({ children }: any): any => children,
}));

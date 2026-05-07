/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';
import React from 'react';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import server from './server';

// 🔱 Polyfills for MSW/Axios (v.17.0.0 CI fix)
if (typeof global.ProgressEvent === 'undefined') {
  (global as any).ProgressEvent = class ProgressEvent extends Event {};
}

/**
 * 🔱 Archon Test Setup: Vitest Lifecycle Orchestration
 * Silicon Valley Standards (v.17.0.0)
 */

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

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
// Use a Proxy to handle any motion[tag] automatically
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string): any =>
        ({ children, ...props }: any): React.ReactElement =>
          React.createElement(tag, props, children),
    }
  ),
  AnimatePresence: ({ children }: any): any => children,
}));

import './polyfills';
/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import '@testing-library/jest-dom';
import React from 'react';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import server from './server';

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
  // 🔱 Memory Hardening: Clear JSDOM body/head to release native DOM node references
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  }
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

// IntersectionObserver Mock (FC-17 Sidebar NavItem Scroll Fade)
type IOCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;
interface IOOptions {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
}
const mockIOCallbacks = new Map<Element, IOCallback>();

class MockIntersectionObserver
  implements Omit<IntersectionObserver, 'root' | 'rootMargin' | 'thresholds'>
{
  static callCount = 0;

  static lastOptions: IOOptions | undefined;

  static reset(): void {
    MockIntersectionObserver.callCount = 0;
    MockIntersectionObserver.lastOptions = undefined;
  }

  readonly root: Element | Document | null = null;

  readonly rootMargin: string = '';

  readonly thresholds: ReadonlyArray<number> = [];

  private ioCallback: IOCallback;

  constructor(callback: IOCallback, options?: IOOptions) {
    MockIntersectionObserver.callCount += 1;
    MockIntersectionObserver.lastOptions = options;
    this.ioCallback = callback;
  }

  observe(el: Element): void {
    mockIOCallbacks.set(el, this.ioCallback);
    this.ioCallback(
      [
        {
          target: el,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: 0,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver
    );
  }

  // eslint-disable-next-line class-methods-use-this
  unobserve(el: Element): void {
    mockIOCallbacks.delete(el);
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
  disconnect(): void {}

  // eslint-disable-next-line class-methods-use-this
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
(
  globalThis as unknown as { archonMockIOCallbacks: Map<Element, IOCallback> }
).archonMockIOCallbacks = mockIOCallbacks;
(globalThis as unknown as { ArchonMockIO: typeof MockIntersectionObserver }).ArchonMockIO =
  MockIntersectionObserver;
afterEach((): void => {
  mockIOCallbacks.clear();
  MockIntersectionObserver.reset();
});

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
  // FC166 Track D (S1444) — `callCount`/`lastOptions` no pueden ser
  // `readonly` directamente (se reasignan en el constructor y en `reset()`,
  // ambos fuera de un inicializador estático). Se mueve el estado mutable
  // a este holder privado — sí genuinamente `readonly` (su referencia nunca
  // cambia, solo sus campos) — y se exponen como getters públicos de solo
  // lectura, preservando la forma externa (`ArchonMockIO.callCount`, etc.)
  // consumida por Sidebar.test.tsx.
  private static readonly state: { callCount: number; lastOptions: IOOptions | undefined } = {
    callCount: 0,
    lastOptions: undefined,
  };

  static get callCount(): number {
    return MockIntersectionObserver.state.callCount;
  }

  static get lastOptions(): IOOptions | undefined {
    return MockIntersectionObserver.state.lastOptions;
  }

  static reset(): void {
    MockIntersectionObserver.state.callCount = 0;
    MockIntersectionObserver.state.lastOptions = undefined;
  }

  readonly root: Element | Document | null = null;

  readonly rootMargin: string = '';

  readonly thresholds: ReadonlyArray<number> = [];

  private readonly ioCallback: IOCallback;

  constructor(callback: IOCallback, options?: IOOptions) {
    MockIntersectionObserver.state.callCount += 1;
    MockIntersectionObserver.state.lastOptions = options;
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

  // eslint-disable-next-line class-methods-use-this
  disconnect(): void {
    // No-op intencional: el mock no retiene estado por-instancia que limpiar
    // al desconectar (`mockIOCallbacks` se limpia globalmente en `afterEach`
    // más abajo); el método existe solo para satisfacer el contrato de
    // `IntersectionObserver` (S1186).
  }

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

import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import server from './server';

// 🔱 Polyfills for MSW/Axios (v.17.0.0 CI fix)
if (typeof global.ProgressEvent === 'undefined') {
  global.ProgressEvent = class ProgressEvent extends Event {};
}

/**
 * 🔱 Archon Test Setup: Vitest Lifecycle Orchestration
 * Silicon Valley Standards (v.17.0.0)
 */

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

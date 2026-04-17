import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './server';

/**
 * 🔱 Archon Test Setup: Vitest Lifecycle Orchestration
 * Silicon Valley Standards (v.17.0.0)
 */

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

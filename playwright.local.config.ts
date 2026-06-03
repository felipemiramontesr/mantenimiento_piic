import { defineConfig, devices } from '@playwright/test';

/**
 * 🔱 Archon E2E — Local Config
 * Target: http://localhost:5173 (Vite dev server)
 * Excludes smoke tests that hit production directly.
 * Usage: npm run test:e2e:local
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/smoke.spec.ts'],
  fullyParallel: true,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: 'html',
  timeout: 45_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

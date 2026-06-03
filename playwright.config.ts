import { defineConfig, devices } from '@playwright/test';

/**
 * 🔱 Archon E2E Infrastructure: Playwright Configuration
 * Implementation: Sovereign Browser Automation (v.78.46.4)
 *
 * Strategy: Chromium-only for speed. Full browser matrix in CI.
 * Prerequisite: Both API and Web dev servers must be running.
 *
 * Environments:
 *   production (default): https://mantenimiento.piic.com.mx
 *   local:                http://localhost:5173  (set E2E_ENV=local)
 *
 * Credentials: set E2E_USERNAME and E2E_PASSWORD env vars.
 * Never hardcode credentials in test files.
 */

const isLocal = process.env.E2E_ENV === 'local';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  /* Global timeout per test */
  timeout: 45_000,

  /* Shared settings for all tests */
  use: {
    baseURL: isLocal ? 'http://localhost:5173' : 'https://mantenimiento.piic.com.mx',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },

  /* Projects: Chromium only for dev speed */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

import { defineConfig, devices } from '@playwright/test';

/**
 * 🔱 Archon E2E Infrastructure: Playwright Configuration
 * Implementation: Sovereign Browser Automation (v.78.46.4)
 *
 * Strategy: Chromium-only for speed. Full browser matrix in CI.
 * Prerequisite: Both API and Web dev servers must be running.
 */
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
    baseURL: 'https://mantenimiento.piic.com.mx',
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

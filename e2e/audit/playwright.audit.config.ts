import { defineConfig, devices } from '@playwright/test';

/**
 * FC 074 F1 — Config dedicado SOLO para la auditoria puntual mobileAudit.spec.ts.
 * No sustituye playwright.local.config.ts (que excluye e2e/audit/** a proposito).
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 45_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

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
  // Retries solo en CI: mitigan el bug intermitente de navegación (URL cambia,
  // módulo no monta — ~13-33% por intento, Kanban web:nav:transition-starvation).
  // NO es la solución de fondo; el fix real requiere su propio FC en apps/web.
  retries: process.env.CI ? 2 : 0,
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

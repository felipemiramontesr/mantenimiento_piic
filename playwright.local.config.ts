import { defineConfig, devices } from '@playwright/test';

/**
 * 🔱 Archon E2E — Local Config
 * Target: http://localhost:5173 (Vite dev server)
 * Excludes smoke tests that hit production directly.
 * Usage: npm run test:e2e:local
 */
export default defineConfig({
  testDir: './e2e',
  // e2e/audit/** = auditoría puntual FC 074 F1 (una vez, no gate de CI —
  // el gate permanente I-RWD vive en su propia spec, FC 074 F5).
  testIgnore: ['**/smoke.spec.ts', '**/audit/**'],
  fullyParallel: true,
  forbidOnly: false,
  // retries=0 deliberado (FC 071 F3): el bug de navegación que motivó retries=2
  // quedó corregido de raíz (fixture fuera de dominio + fallbacks + ErrorBoundary).
  // Verificado: 270/270 local + 2 runs CI consecutivos con flaky=0/unexpected=0
  // leídos del report.json del artifact. Si reaparece flakiness, va a K — no aquí.
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

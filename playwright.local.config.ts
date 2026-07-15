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
      // FC 074 F5 — testIgnore de project NO se fusiona con el global, lo
      // reemplaza — hay que repetir smoke/audit aquí además de responsive
      // (el gate I-RWD corre en sus propios projects rwd-*, cond.5).
      testIgnore: ['**/smoke.spec.ts', '**/audit/**', '**/responsive.spec.ts'],
    },
    // FC 074 F5 — Gate_Permanente_RWD_Y_Manifest: 6 viewport-configs (4
    // portrait + 2 landscape, dominio cerrado en 074_AN) × 9 módulos, cada
    // project corre SOLO e2e/responsive.spec.ts (spec dedicada, cond.5).
    {
      name: 'rwd-mobile-360',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 640 } },
      testMatch: ['**/responsive.spec.ts'],
    },
    {
      name: 'rwd-mobile-390',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
      testMatch: ['**/responsive.spec.ts'],
    },
    {
      name: 'rwd-tablet-768',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
      testMatch: ['**/responsive.spec.ts'],
    },
    {
      name: 'rwd-desktop-1280',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
      testMatch: ['**/responsive.spec.ts'],
    },
    {
      name: 'rwd-mobile-landscape-844',
      use: { ...devices['Desktop Chrome'], viewport: { width: 844, height: 390 } },
      testMatch: ['**/responsive.spec.ts'],
    },
    {
      name: 'rwd-tablet-landscape-1024',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } },
      testMatch: ['**/responsive.spec.ts'],
    },
  ],
});

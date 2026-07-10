import { test, expect } from '@playwright/test';
import setupApiMocks from './mocks';

/**
 * 🔱 Archon E2E Suite: Authentication Flow
 * Scope: Login → Dashboard → Logout
 * v.78.101.39 - Sovereign Browser Certification
 */
test.describe('Archon Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Accept cookies on every page load — never blocks rendering
    await page.addInitScript(() => {
      localStorage.setItem('cookies_accepted', 'true');
    });
    await setupApiMocks(page);
  });

  test('should display login page with correct branding', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('Acceso Archon')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Control de Flotas')).toBeVisible();
    await expect(page.getByPlaceholder('usuario o correo@empresa.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: /Acceder al Sistema/i })).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('usuario o correo@empresa.com').fill('wrong_user');
    await page.getByPlaceholder('••••••••').fill('wrong_password');
    await page.getByRole('button', { name: /Acceder al Sistema/i }).click();

    await expect(page.getByText(/Credenciales inválidas|Error de conexión/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('should login successfully and navigate to dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('usuario o correo@empresa.com').fill('GrayMan');
    await page.getByPlaceholder('••••••••').fill('Archon2026!');
    await page.getByRole('button', { name: /Acceder al Sistema/i }).click();

    await page.waitForURL('**/dashboard**', { timeout: 15_000 });
    await expect(page.getByText('Centro de Comando')).toBeVisible({ timeout: 10_000 });
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Ensure no token exists before navigation
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    });

    await page.goto('/dashboard');
    await page.waitForURL('**/login**', { timeout: 10_000 });
    await expect(page.getByText('Acceso Archon')).toBeVisible({ timeout: 5_000 });
  });

  test('should persist session across page navigations', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByPlaceholder('usuario o correo@empresa.com').fill('GrayMan');
    await page.getByPlaceholder('••••••••').fill('Archon2026!');
    await page.getByRole('button', { name: /Acceder al Sistema/i }).click();
    await page.waitForURL('**/dashboard**', { timeout: 15_000 });

    // Navigate to fleet via sidebar (client-side route change) — session
    // should persist without re-authenticating. Note: a hard page.goto()
    // reload is NOT used here on purpose — the app stores the access token
    // in-memory only (AuthContext v3.0.0), so a full reload always clears it
    // and relies on /auth/refresh (mocked as no-session) to restore it; that
    // is a separate, real session-restore concern out of scope for this FC.
    await page.getByTestId('nav-item-unidades').click();
    await expect(page.getByText('Administrar Unidades')).toBeVisible({ timeout: 15_000 });
  });
});

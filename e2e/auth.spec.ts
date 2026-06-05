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
    await expect(page.getByPlaceholder('ID de Archon')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: /Acceder al Sistema/i })).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('ID de Archon').fill('wrong_user');
    await page.getByPlaceholder('••••••••').fill('wrong_password');
    await page.getByRole('button', { name: /Acceder al Sistema/i }).click();

    await expect(page.getByText(/Credenciales inválidas|Error de conexión/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('should login successfully and navigate to dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('ID de Archon').fill('GrayMan');
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
    await page.getByPlaceholder('ID de Archon').fill('GrayMan');
    await page.getByPlaceholder('••••••••').fill('Archon2026!');
    await page.getByRole('button', { name: /Acceder al Sistema/i }).click();
    await page.waitForURL('**/dashboard**', { timeout: 15_000 });

    // Navigate to fleet — session should persist
    await page.goto('/dashboard/fleet');
    await expect(page.getByText('Administrar Unidades')).toBeVisible({ timeout: 15_000 });
  });
});

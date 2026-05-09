import { test, expect } from '@playwright/test';
import setupApiMocks from './mocks';

/**
 * 🔱 Archon E2E Suite: Authentication Flow
 * Scope: Login → Dashboard → Logout
 * v.78.46.4 - Sovereign Browser Certification
 */
test.describe('Archon Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks
    await setupApiMocks(page);

    // Clear any stale session
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.setItem('cookies_accepted', 'true');
    });
  });

  test('should display login page with PIIC branding', async ({ page }) => {
    await page.goto('/login');

    // Verify the Archon login form exists
    await expect(page.getByText(/Acceso Archon/i)).toBeVisible();
    await expect(page.getByText(/Control de Flotas/i)).toBeVisible();
    await expect(page.getByPlaceholder(/ID de Archon/i)).toBeVisible();
    await expect(page.getByPlaceholder(/••••••••/i)).toBeVisible();
    await expect(page.getByText(/Acceder al Sistema/i)).toBeVisible();

    // Verify PIIC branding
    await expect(page.locator('body')).toContainText(/PIIC TECH/i);
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('ID de Archon').fill('wrong_user');
    await page.getByPlaceholder('••••••••').fill('wrong_password');
    await page.getByText('Acceder al Sistema').click();

    // Wait for error message
    await expect(page.getByText(/Credenciales inválidas|Error de conexión/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('should login successfully with valid credentials and navigate to dashboard', async ({
    page,
  }) => {
    await page.goto('/login');

    // Use the Archon master account
    await page.getByPlaceholder(/ID de Archon/i).fill('GrayMan');
    await page.getByPlaceholder(/••••••••/i).fill('Archon2026!');
    await page.getByText(/Acceder al Sistema/i).click();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15_000 });

    // Verify we're on the dashboard
    await expect(page.getByText('Centro de Comando')).toBeVisible({ timeout: 10_000 });
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should be redirected to login
    await page.waitForURL('**/login**', { timeout: 10_000 });
    await expect(page.getByText('Acceso Archon')).toBeVisible();
  });
});

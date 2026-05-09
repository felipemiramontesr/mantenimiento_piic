import { test, expect, Page } from '@playwright/test';
import setupApiMocks from './mocks';

/**
 * 🔱 Archon E2E Suite: Dashboard Navigation & Fleet Operations
 * Scope: Sidebar → Module Navigation → Fleet Grid → Route Management
 * v.78.46.4 - Sovereign Browser Certification
 */

/**
 * Helper: Login and navigate to Dashboard.
 * Reusable across all dashboard E2E tests.
 */
async function loginAndNavigate(page: Page): Promise<void> {
  await setupApiMocks(page);
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('cookies_accepted', 'true');
  });
  await page.getByPlaceholder(/ID de Archon/i).fill('GrayMan');
  await page.getByPlaceholder(/••••••••/i).fill('Archon2026!');
  await page.getByText(/Acceder al Sistema/i).click();
  await page.waitForURL('**/dashboard**', { timeout: 15_000 });
}

test.describe('Dashboard Module Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
  });

  test('should render the Centro de Comando (Home Dashboard)', async ({ page }) => {
    await expect(page.getByText('Centro de Comando')).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate to Fleet module via sidebar', async ({ page }) => {
    // Click the Fleet icon in the sidebar using data-testid
    await page.getByTestId('nav-item-unidades').click();
    await expect(page.getByText(/Administrar Unidades/i)).toBeVisible({ timeout: 15_000 });
  });

  test('should navigate to Routes module via sidebar', async ({ page }) => {
    await page.getByTestId('nav-item-rutas').click();
    await expect(
      page.getByText(/Bitácora de Rutas/i).or(page.getByText(/Gestión de Rutas/i))
    ).toBeVisible({ timeout: 15_000 });
  });

  test('should navigate to Users module via sidebar', async ({ page }) => {
    await page.getByTestId('nav-item-personal').click();
    await expect(
      page.getByText(/Administrar Personal/i).or(page.getByText(/Personal/i))
    ).toBeVisible({ timeout: 15_000 });
  });

  test('should navigate to Settings module', async ({ page }) => {
    await page.getByTestId('nav-item-settings').click();
    await expect(
      page.getByText(/Configuración del Sistema/i).or(page.getByText(/Ajustes/i))
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Fleet Module Operations', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto('/dashboard/fleet');
    await page.waitForTimeout(2000);
  });

  test('should display the fleet inventory grid', async ({ page }) => {
    await expect(page.getByText('Administrar Unidades')).toBeVisible({ timeout: 10_000 });
  });

  test('should open fleet registration form when clicking "Iniciar Registro"', async ({ page }) => {
    const registerBtn = page.getByText(/Iniciar Registro/i);

    if (await registerBtn.isVisible()) {
      await registerBtn.click();
      // The form should show the IDENTIDAD section
      await expect(page.getByText('IDENTIDAD')).toBeVisible({ timeout: 5_000 });
    }
  });
});

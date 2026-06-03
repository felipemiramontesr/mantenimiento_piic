import { test, expect, Page } from '@playwright/test';
import setupApiMocks from './mocks';

/**
 * 🔱 Archon E2E Suite: Fleet Operations
 * Scope: Inventory Grid → Registration → Forensic Audit
 * v.78.50.0 - Sovereign Fleet Certification
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

test.describe('Fleet Sovereign Operations', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
    // Navigate to Fleet via Sidebar TestID
    await page.getByTestId('nav-item-unidades').click();
    await page.waitForURL('**/dashboard/fleet**', { timeout: 10_000 });
  });

  test('should certify the Fleet Inventory Grid integrity', async ({ page }) => {
    // Verify main header
    await expect(page.getByText('Administrar Unidades')).toBeVisible();

    // Verify the inventory table exists
    const table = page.getByTestId('fleet-inventory-table');
    await expect(table).toBeVisible();

    // Verify at least one unit from mocks is present
    // Mock ID is ASM-E2E
    await expect(page.getByTestId('fleet-row-asm-e2e')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Toyota Hilux')).toBeVisible();
  });

  test('should certify the Fleet Registration architecture', async ({ page }) => {
    // Verify the grid is visible (strategy view is the default)
    await expect(page.getByTestId('fleet-inventory-table')).toBeVisible();
    // Verify the registration management card
    await expect(page.getByTestId('fleet-registration-btn')).toBeVisible();

    // Open Registration Form
    await page.getByTestId('fleet-registration-btn').click();

    // Verify Form Sections (Industrial 2x2 Axis)
    await expect(page.getByText('IDENTIDAD')).toBeVisible();
    await expect(page.getByText('CUMPLIMIENTO')).toBeVisible();
    await expect(page.getByText('Perfil Técnico de la Unidad')).toBeVisible();
    await expect(page.getByText('Logística Estratégica & Mto.')).toBeVisible();

    // Verify critical fields
    await expect(page.getByText('Número Económico')).toBeVisible();
    await expect(page.getByPlaceholder('Ej: VEH-001')).toBeVisible();
  });

  test('should verify predictive maintenance forecasting logic', async ({ page }) => {
    // Check the health status in the grid
    const unitRow = page.getByTestId('fleet-row-asm-e2e');
    await expect(unitRow.getByText(/PRONÓSTICO|VENCIDO/i)).toBeVisible();
  });
});

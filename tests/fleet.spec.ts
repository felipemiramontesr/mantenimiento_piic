import { test, expect } from '@playwright/test';

/**
 * 🔱 Archon E2E Certification: Fleet Management
 * Flow: Discovery -> Registration -> Success (v.17.0.0)
 */
test.describe('Archon Fleet Management Module', () => {
  test.beforeEach(async ({ page }) => {
    // 🛡️ AUTHENTICATION BOOTSTRAP
    // In a real Silicon Valley CI/CD, we'd use a storageState or a fast-login API
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@piic.mx');
    await page.fill('input[type="password"]', 'Archon2026!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should navigate to fleet module and register an industrial asset', async ({ page }) => {
    // 1. Navigation to Fleet Module
    await page.goto('/dashboard/fleet');
    await expect(page.getByText('Archon Fleet Admin')).toBeVisible();

    // 2. Discovery: Verify Operational Cards
    await expect(page.getByText('Incorporación de Activos')).toBeVisible();
    
    // 3. Action: Start Registration
    await page.click('text=Iniciar Registro');
    await expect(page.getByText('Clasificación del Activo')).toBeVisible();

    // 4. Input: Fill High-Precision Form
    await page.fill('input[placeholder="Ej. ASM-001"]', 'E2E-TEST-001');
    await page.selectOption('select >> nth=0', 'Vehiculo'); // Asset Type
    await page.fill('input[type="number"]', '2025'); // Year
    
    // 5. Submission
    await page.click('text=Confirmar Registro e Incorporar');

    // 6. Validation: Success View Transition
    await expect(page.getByText('Unidad Registrada con Éxito')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2E-TEST-001')).toBeVisible();

    // 7. Cleanup/Next Steps
    await page.click('text=Centro de Comando');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should allow returning to dashboard via Navigation Menu', async ({ page }) => {
    await page.goto('/dashboard/fleet');
    await page.getByLabel('Navigation Menu').click();
    await expect(page.getByText('Cerrar Sesión')).toBeVisible();
  });
});

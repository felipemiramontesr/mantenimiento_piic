import { test, expect } from '@playwright/test';
import setupApiMocks from './mocks';

/**
 * 🔱 Archon E2E Suite: Forensic Odometer Parity
 * Scope: Inventory → Journal Edit → Inventory Parity Check
 * Protocol: X=Y (V.78.100.19)
 */
test.describe('Archon Forensic Parity Certification', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);

    // Login as GrayMan
    await page.goto('/login');
    await page.getByPlaceholder(/ID de Archon/i).fill('GrayMan');
    await page.getByPlaceholder(/••••••••/i).fill('Archon2026!');
    await page.getByText(/Acceder al Sistema/i).click();
    await page.waitForURL('**/dashboard**');
  });

  test('should propagate odometer changes from Journal to Inventory (ASM-006 Case)', async ({
    page,
  }) => {
    // 1. Navigate to "Administrar Unidades"
    await page.getByText(/Administrar Unidades/i).click();

    // 2. Capture initial state of ASM-006
    const asm006Row = page.locator('tr').filter({ hasText: 'ASM-006' });
    await expect(asm006Row).toContainText('357,900');

    // 3. Navigate to "Registro de Rutas"
    await page.getByText(/Registro de Rutas/i).click();

    // 4. Find and Edit the journey for ASM-006
    const routeRow = page.locator('tr').filter({ hasText: 'ASM-006' }).first();
    await routeRow.locator('button.btn-edit-route').click(); // Assuming this selector exists

    // 5. Update the odometer to 400,000 (The forensic fix)
    await page.getByLabel(/Lectura Final/i).fill('400000');
    await page.getByText(/Guardar Cambios/i).click();

    // 6. Verify success notification (Caché-First feedback)
    await expect(page.getByText(/Ruta actualizada/i)).toBeVisible();

    // 7. Return to "Administrar Unidades"
    await page.getByText(/Administrar Unidades/i).click();

    // 8. CERTIFICATION: ASM-006 MUST now show 400,000 KM
    await expect(asm006Row).toContainText('400,000');
  });
});

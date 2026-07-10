import { test, expect } from '@playwright/test';

/**
 * 🔱 Archon Live Smoke Test: Real Credentials Validation
 * v.1.0.0 - Production Connectivity Audit
 */
test('should login to live site with GrayMan credentials', async ({ page }) => {
  await page.goto('https://mantenimiento.piic.com.mx/login');

  // Accept cookies if present
  await page.evaluate(() => {
    localStorage.setItem('cookies_accepted', 'true');
  });

  // Type credentials — sourced from environment variables (never hardcode)
  const username = process.env.E2E_USERNAME ?? 'GrayMan';
  const password = process.env.E2E_PASSWORD ?? '';
  await page.getByPlaceholder(/usuario o correo@empresa\.com/i).fill(username);
  await page.getByPlaceholder(/••••••••/i).fill(password);

  // Click login
  await page.getByText(/Acceder al Sistema/i).click();

  // Wait for Dashboard
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Verify Sidebar items
  await expect(page.getByText(/Unidades/i)).toBeVisible();
  await expect(page.getByText(/Personal/i)).toBeVisible();

  // Navigate to Units
  await page
    .getByText(/Unidades/i)
    .first()
    .click();
  await expect(page.getByText(/Administrar Unidades/i)).toBeVisible({ timeout: 10000 });
});

import { test, expect, Page } from '@playwright/test';

/**
 * 🔱 Archon Live Smoke Test: Real Credentials Validation
 * v.1.0.0 - Production Connectivity Audit
 * FC130 F2/M2 (Cond.R-130-M2) — extendido para cubrir el ciclo de sesión
 * completo (login/refresh/logout) contra PROD real, no solo login.
 * switch-tenant NO se automatiza aquí: `grep -rn "switch-tenant" apps/web/src`
 * confirma que hoy no existe ningún selector de Universo en el producto (el
 * único rol con permisos operativos es GrayMan) — no hay nada real que
 * ejercer todavía. Cuando exista un actor multi-tenant operable, añadir un
 * test aquí que haga clic en el selector real, no una llamada sintética.
 *
 * Credenciales: E2E_USERNAME / E2E_PASSWORD por variable de entorno. Nunca
 * hardcodeadas. Cada test es independiente y termina en el mismo estado en
 * que empezó (sin sesión) para no dejar residuo en un usuario real de PROD.
 */

async function loginAsGrayMan(page: Page): Promise<void> {
  await page.goto('/login');

  await page.evaluate(() => {
    localStorage.setItem('cookies_accepted', 'true');
  });

  const username = process.env.E2E_USERNAME ?? 'GrayMan';
  const password = process.env.E2E_PASSWORD ?? '';
  await page.getByPlaceholder(/usuario o correo@empresa\.com/i).fill(username);
  await page.getByPlaceholder(/••••••••/i).fill(password);
  await page.getByText(/Acceder al Sistema/i).click();

  await page.waitForURL('**/dashboard**', { timeout: 15_000 });
}

test('should login to live site with GrayMan credentials', async ({ page }) => {
  await loginAsGrayMan(page);

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

// FC130 F2/M2 (Cond.R-130-M2) — el access token vive solo en memoria
// (AuthContext v3.0.0); un reload real fuerza POST /auth/refresh contra el
// refresh_token httpOnly emitido por /login. Si la sesión se restaura sin
// volver a /login, el ciclo de refresh real de PROD está sano.
test('should restore session via refresh after a hard reload', async ({ page }) => {
  await loginAsGrayMan(page);

  await page.reload();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  await expect(page.getByText(/Centro de Comando/i)).toBeVisible({ timeout: 15_000 });
});

// FC130 F2/M2 (Cond.R-130-M2) — mismo botón/testid ya usado en e2e/auth.spec.ts
// (mockeado); aquí ejercita POST /auth/logout real contra PROD.
test('should logout and clear the live session', async ({ page }) => {
  await loginAsGrayMan(page);

  await page.getByTestId('nav-item-logout').click();

  await page.waitForURL('**/login**', { timeout: 10_000 });
  await expect(page.getByText(/Acceso Archon/i)).toBeVisible({ timeout: 5_000 });

  // Confirma que la sesión quedó realmente cerrada — un reload no debe
  // restaurarla (el refresh_token real fue limpiado por /auth/logout).
  await page.reload();
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});

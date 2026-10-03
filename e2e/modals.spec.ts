import { test, expect, Page } from '@playwright/test';
import loginAs from './helpers';

/**
 * FC203 F1 (B3-DEF1 · Invariante 1) — las ventanas `ArchonModal` deben abrir con un clic REAL de
 * navegador. En jsdom la regresión no se reproduce (React difiere el efecto); aquí, en Chromium, el
 * mismo clic que abría la ventana la cerraba al llegar a `document`.
 */

const UNIVERSE = {
  id: 2,
  code: 'QA-UNI',
  label: 'QA Universo Prueba',
  universeTypeCode: 'FMS',
  activeSuperclusters: 5,
  activeClusters: 1,
};

async function mockCosmology(page: Page): Promise<void> {
  const isApi = (url: URL): boolean => url.port === '3001';
  await page.route(
    (url) => isApi(url) && url.pathname.endsWith('/cosmology/universes'),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [UNIVERSE] }),
      });
    }
  );
  await page.route(
    (url) => isApi(url) && url.pathname.includes('/cosmology/'),
    async (route) => {
      if (route.request().url().endsWith('/cosmology/universes')) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
  );
}

test.describe('ArchonModal — apertura con clic real (FC203 F1)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await mockCosmology(page);
    // Navegación dentro de la SPA: `page.goto` recargaría y perdería la sesión en memoria.
    await page.getByTestId('nav-item-cosmología').click();
    await expect(page.getByTestId(`cosmology-universe-row-${UNIVERSE.id}`)).toBeVisible();
  });

  test('Renombrar abre la ventana y se queda abierta', async ({ page }) => {
    await page.getByTestId(`cosmology-universe-rename-${UNIVERSE.id}`).click();

    await expect(page.getByTestId('rename-universe-form')).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('rename-universe-form')).toBeVisible();
  });

  test('un clic dentro no la cierra; Escape sí', async ({ page }) => {
    await page.getByTestId(`cosmology-universe-rename-${UNIVERSE.id}`).click();
    await page.getByTestId('rename-universe-input').click();
    await expect(page.getByTestId('rename-universe-form')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('rename-universe-form')).toBeHidden();
  });

  test('Destruir abre su ventana de confirmación', async ({ page }) => {
    await page.getByTestId(`cosmology-universe-destroy-${UNIVERSE.id}`).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

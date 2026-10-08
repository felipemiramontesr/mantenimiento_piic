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

/** FC204 F4 — un usuario de la consola de usuarios de plataforma, miembro de `UNIVERSE`. */
const PLATFORM_USER = {
  id: 20,
  username: 'arc.user',
  fullName: 'Arc User',
  email: 'arc@piic.mx',
  isActive: true,
  roleId: 2, // FC207 F2 — no es Ω
  tenantId: UNIVERSE.id,
  tenantName: UNIVERSE.label,
  cosmonautType: 'ARC',
};

/** FC206 F1 — un itinerante (sin Universo) al que Ω puede vincular. */
const ITINERANT_USER = {
  ...PLATFORM_USER,
  id: 21,
  username: 'nomad',
  tenantId: null,
  tenantName: null,
  cosmonautType: null,
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
      if (new URL(route.request().url()).pathname.endsWith('/cosmology/users')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [PLATFORM_USER, ITINERANT_USER], total: 2 }),
        });
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

  test('FC204 F4 — Restablecer 2FA abre la confirmación nominal y se queda abierta', async ({
    page,
  }) => {
    const key = `${PLATFORM_USER.id}-${UNIVERSE.id}`;
    await page.getByTestId(`platform-user-reset-mfa-${key}`).click();

    await expect(page.getByTestId('sovereign-action-modal')).toBeVisible();
    await expect(page.getByTestId('sovereign-action-submit')).toBeDisabled();
    // Escribir dentro tras el clic de apertura prueba que la ventana sigue montada.
    await page.getByTestId('sovereign-action-universe-name').fill(UNIVERSE.label);
    await expect(page.getByTestId('sovereign-action-submit')).toBeEnabled();
    await expect(page.getByTestId('sovereign-action-modal')).toBeVisible();
  });

  test('FC206 F1 — Vincular a Universo abre su ventana y se queda abierta', async ({ page }) => {
    await page.getByTestId(`platform-user-link-${ITINERANT_USER.id}-itinerant`).click();

    await expect(page.getByTestId('link-universe-modal')).toBeVisible();
    await expect(page.getByTestId('link-universe-submit')).toBeDisabled();
    // Escribir dentro tras el clic de apertura prueba que la ventana sigue montada.
    await page.getByTestId('link-universe-name').fill(UNIVERSE.label);
    await expect(page.getByTestId('link-universe-modal')).toBeVisible();
  });

  test('Destruir abre su ventana de confirmación', async ({ page }) => {
    await page.getByTestId(`cosmology-universe-destroy-${UNIVERSE.id}`).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

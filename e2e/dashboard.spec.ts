import { test, expect } from '@playwright/test';
import loginAs from './helpers';

/**
 * 🔱 Archon E2E Suite: Dashboard Navigation & Layout
 * Scope: Sidebar → Module navigation → ArchonCenter KPIs
 * v.78.101.39
 */
test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('should render the Centro de Comando (Home Dashboard)', async ({ page }) => {
    await expect(page.getByText('Centro de Comando')).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate to Fleet module via sidebar', async ({ page }) => {
    await page.getByTestId('nav-item-unidades').click();
    await expect(page.getByText('Administrar Unidades')).toBeVisible({ timeout: 15_000 });
  });

  test('should navigate to Maintenance module via sidebar', async ({ page }) => {
    await page.getByTestId('nav-item-mantenimiento').click();
    await expect(page.getByText('Administrar Mantenimientos')).toBeVisible({ timeout: 15_000 });
  });

  test('should navigate to Routes module via sidebar', async ({ page }) => {
    await page.getByTestId('nav-item-rutas').click();
    // getByRole('heading', ...) en vez de getByText: el título de sección se
    // renderiza como <h2> (SovereignHeader.tsx); getByText hacía match con el
    // <span> del propio label del sidebar (mismo texto "Rutas", oculto por
    // CSS cuando el sidebar colapsa) en vez del contenido de la página.
    await expect(page.getByRole('heading', { name: 'Administrar Rutas' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('should navigate to Finance module via sidebar', async ({ page }) => {
    await page.getByTestId('nav-item-finanzas').click();
    await expect(page.getByRole('heading', { name: 'Finanzas' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('should navigate to Users module via sidebar', async ({ page }) => {
    await page.getByTestId('nav-item-personal').click();
    await expect(page.getByText('Administrar Personal')).toBeVisible({ timeout: 15_000 });
  });

  test('should navigate to Incidents module via sidebar', async ({ page }) => {
    await page.getByTestId('nav-item-incidencias').click();
    await expect(page.getByText('Incidencias en Ruta')).toBeVisible({ timeout: 15_000 });
  });

  test('should navigate to Settings module via sidebar', async ({ page }) => {
    await page.getByTestId('nav-item-settings').click();
    await expect(page.getByRole('heading', { name: 'Configuración de Identidad' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('should navigate to Admin module via sidebar', async ({ page }) => {
    await page.getByTestId('nav-item-admin').click();
    await expect(page.getByRole('heading', { name: 'Panel de Control' })).toBeVisible({
      timeout: 15_000,
    });
  });
});

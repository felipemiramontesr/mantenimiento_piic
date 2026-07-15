/* eslint-disable no-await-in-loop, no-restricted-syntax, no-continue --
   barrido secuencial e intencional de una matriz 9x6 en sesión única (login
   real, navegación de UI) — no es paralelizable ni expresable como array
   iteration sin perder el orden de navegación/medición. */
import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import loginAs from '../helpers';

/**
 * FC 074 F1 — Mobile_First_Global_Responsiveness
 * Auditoria unica (NO gate de CI, eso es F5): barre el dominio I-RWD
 * (9 modulos x 6 viewport-configs = 54 celdas) en una sola sesion
 * autenticada (login unico, navegacion secuencial — evita 54 logins reales
 * que degradan el dev-server bajo carga sostenida) y escribe evidencia
 * cruda a protocols/analysis/074_AN_MobileAuditMatrix.raw.json.
 */

interface ViewportConfig {
  key: string;
  width: number;
  height: number;
}

interface ModuleConfig {
  key: string;
  testId: string;
  heading: string;
  byRole?: boolean;
}

interface TouchViolation {
  tag: string;
  text: string;
  width: number;
  height: number;
}

interface AuditResult {
  module: string;
  viewport: string;
  viewportWidth: number;
  scrollWidth: number;
  hScrollViolation: boolean;
  touchViolations: TouchViolation[];
}

const VIEWPORTS: ViewportConfig[] = [
  { key: '360x640', width: 360, height: 640 },
  { key: '390x844', width: 390, height: 844 },
  { key: '768x1024', width: 768, height: 1024 },
  { key: '1280x720', width: 1280, height: 720 },
  { key: '844x390-landscape', width: 844, height: 390 },
  { key: '1024x768-landscape', width: 1024, height: 768 },
];

const MODULES: ModuleConfig[] = [
  { key: 'comando', testId: 'nav-item-comando', heading: 'Centro de Comando' },
  { key: 'unidades', testId: 'nav-item-unidades', heading: 'Administrar Unidades' },
  { key: 'mantenimiento', testId: 'nav-item-mantenimiento', heading: 'Administrar Mantenimientos' },
  { key: 'rutas', testId: 'nav-item-rutas', heading: 'Administrar Rutas', byRole: true },
  { key: 'finanzas', testId: 'nav-item-finanzas', heading: 'Finanzas', byRole: true },
  { key: 'personal', testId: 'nav-item-personal', heading: 'Administrar Personal' },
  { key: 'incidencias', testId: 'nav-item-incidencias', heading: 'Incidencias en Ruta' },
  {
    key: 'settings',
    testId: 'nav-item-settings',
    heading: 'Configuración de Identidad',
    byRole: true,
  },
  { key: 'admin', testId: 'nav-item-admin', heading: 'Panel de Control', byRole: true },
];

// Cond.3 Bravo: tolerancia documentada ±1px (redondeo de scrollbar/subpixel).
const H_SCROLL_TOLERANCE_PX = 1;
// Cond.3 Bravo: solo primary/nav/acciones visibles — no todo elemento interactivo.
const TOUCH_TARGET_SELECTOR =
  'nav a, nav button, [data-testid^="nav-item"], header button, main button, main a[role="button"]';
const MIN_TOUCH_TARGET_PX = 44;

// Sustituye esperas fijas (Sonar S2925) por sincronizacion en un doble
// requestAnimationFrame: garantiza que el layout/paint del ciclo de
// transicion (drawer, transiciones CSS) ya se aplico antes de medir.
async function waitForNextPaint(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
}

test.describe.configure({ mode: 'serial' });

test('FC074 F1 — Mobile Audit Matrix (una vez, no gatea CI, sesión única)', async ({ page }) => {
  test.setTimeout(20 * 60_000);

  const results: AuditResult[] = [];

  // Login unico a viewport desktop neutro; luego se re-dimensiona por celda.
  await page.setViewportSize({ width: 1280, height: 720 });
  await loginAs(page);

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const mod of MODULES) {
      if (vp.width < 768) {
        await page.getByRole('button', { name: 'Toggle Menu' }).click();
        await expect(page.getByTestId(mod.testId)).toBeVisible({ timeout: 5_000 });
      }
      await page.getByTestId(mod.testId).click();

      if (mod.byRole) {
        await expect(page.getByRole('heading', { name: mod.heading })).toBeVisible({
          timeout: 15_000,
        });
      } else {
        await expect(page.getByText(mod.heading)).toBeVisible({ timeout: 15_000 });
      }

      // Deja asentar animaciones de drawer/transition antes de medir.
      await waitForNextPaint(page);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const touchViolations: TouchViolation[] = await page.evaluate(
        ({ selector, minSize }) => {
          const els = Array.from(document.querySelectorAll(selector));
          const bad: { tag: string; text: string; width: number; height: number }[] = [];
          for (const el of els) {
            const rect = (el as HTMLElement).getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue; // no visible en este viewport
            if (Math.min(rect.width, rect.height) < minSize) {
              bad.push({
                tag: el.tagName,
                text: (el.textContent || '').trim().slice(0, 40),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              });
            }
          }
          return bad;
        },
        { selector: TOUCH_TARGET_SELECTOR, minSize: MIN_TOUCH_TARGET_PX }
      );

      results.push({
        module: mod.key,
        viewport: vp.key,
        viewportWidth: vp.width,
        scrollWidth,
        hScrollViolation: scrollWidth > vp.width + H_SCROLL_TOLERANCE_PX,
        touchViolations,
      });
    }
  }

  const outDir = path.resolve(__dirname, '../../protocols/analysis');
  fs.writeFileSync(
    path.join(outDir, '074_AN_MobileAuditMatrix.raw.json'),
    JSON.stringify(results, null, 2)
  );

  expect(results).toHaveLength(VIEWPORTS.length * MODULES.length);
});

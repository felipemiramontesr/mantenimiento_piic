/* eslint-disable no-await-in-loop, no-restricted-syntax, no-continue --
   barrido secuencial de matriz (mismo patrón que mobileAudit.spec.ts FC074
   F1): sesión única autenticada, navegación ordenada, no paralelizable. */
import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import loginAs from '../helpers';

/**
 * Auditoría visual UI/UX (one-shot, NO gate de CI) — orden de Ω 2026-07-17:
 * "componentes que se desbordan o quedan mal formados; énfasis en TODAS las
 * tablas". Captura screenshot full-page por módulo × viewport Y recolecta
 * métricas de DESBORDE INTERNO que el gate I-RWD (nivel documento) no ve:
 * elementos con scrollWidth > clientWidth (scroll/compresión interna),
 * tablas y sus anchos reales, y elementos que rebasan el viewport.
 * Evidencia → scratchpad (imágenes) + JSON crudo para el 078_AN.
 */

const OUT_DIR = process.env.AUDIT_OUT_DIR || path.join(__dirname, '..', '..', 'audit-out');

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

const VIEWPORTS: ViewportConfig[] = [
  { key: '360', width: 360, height: 640 },
  { key: '768', width: 768, height: 1024 },
  { key: '1280', width: 1280, height: 720 },
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

interface OverflowFinding {
  kind: 'internal-scroll' | 'viewport-bleed' | 'table';
  selectorHint: string;
  clientWidth: number;
  scrollWidth: number;
  rectRight: number;
  columns?: number;
}

interface CellAudit {
  module: string;
  viewport: string;
  findings: OverflowFinding[];
}

const results: CellAudit[] = [];

test.describe('UI Visual Audit — overflow interno + screenshots', () => {
  test('barrido completo', async ({ browser }) => {
    test.setTimeout(15 * 60 * 1000);
    fs.mkdirSync(OUT_DIR, { recursive: true });

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();
      await loginAs(page);

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
        // doble rAF + respiro para settle de layout/imágenes
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            })
        );
        await page.waitForTimeout(400);

        // cerrar drawer móvil para que no tape el contenido en el screenshot
        if (vp.width < 768) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        }

        const findings: OverflowFinding[] = await page.evaluate((vpWidth) => {
          const out: {
            kind: 'internal-scroll' | 'viewport-bleed' | 'table';
            selectorHint: string;
            clientWidth: number;
            scrollWidth: number;
            rectRight: number;
            columns?: number;
          }[] = [];
          const hint = (el: Element): string => {
            const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : '';
            const testid = el.getAttribute('data-testid')
              ? `[data-testid=${el.getAttribute('data-testid')}]`
              : '';
            const cls = (
              el.className && typeof el.className === 'string'
                ? `.${el.className.split(' ').slice(0, 3).join('.')}`
                : ''
            ).slice(0, 80);
            return `${el.tagName.toLowerCase()}${id}${testid}${cls}`;
          };
          // OJO: el <main> de esta app NO envuelve el contenido del módulo
          // (verificado en vivo: tablesInMain=0 vs tables=1 en document) —
          // root = body, excluyendo chrome (nav/aside/header/footer).
          const root = document.body;
          const all = Array.from(root.querySelectorAll<HTMLElement>('*'));
          for (const el of all) {
            if (el.closest('nav, aside, header, footer')) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            // scroll interno horizontal real (≥8px para filtrar ruido subpixel)
            if (el.scrollWidth - el.clientWidth >= 8) {
              out.push({
                kind: 'internal-scroll',
                selectorHint: hint(el),
                clientWidth: el.clientWidth,
                scrollWidth: el.scrollWidth,
                rectRight: Math.round(rect.right),
              });
            }
            // elemento que sangra fuera del viewport (≥8px)
            if (rect.right - vpWidth >= 8) {
              out.push({
                kind: 'viewport-bleed',
                selectorHint: hint(el),
                clientWidth: el.clientWidth,
                scrollWidth: el.scrollWidth,
                rectRight: Math.round(rect.right),
              });
            }
          }
          // inventario de tablas visibles con conteo de columnas
          for (const t of Array.from(root.querySelectorAll('table'))) {
            const rect = t.getBoundingClientRect();
            if (rect.width === 0) continue;
            const cols = t.querySelectorAll('thead th').length;
            out.push({
              kind: 'table',
              selectorHint: hint(t),
              clientWidth: (t as HTMLElement).clientWidth,
              scrollWidth: (t as HTMLElement).scrollWidth,
              rectRight: Math.round(rect.right),
              columns: cols,
            });
          }
          return out;
        }, vp.width);

        results.push({ module: mod.key, viewport: vp.key, findings });

        await page.screenshot({
          path: path.join(OUT_DIR, `${mod.key}-${vp.key}.png`),
          fullPage: true,
        });
      }
      await context.close();
    }

    fs.writeFileSync(path.join(OUT_DIR, 'overflow-metrics.json'), JSON.stringify(results, null, 2));
    expect(results.length).toBe(MODULES.length * VIEWPORTS.length);
  });
});

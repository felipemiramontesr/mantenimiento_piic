/* eslint-disable no-restricted-syntax, no-continue --
   for-loop de generación de tests (dominio 9 módulos) y bucle de medición
   dentro de page.evaluate (ejecuta en el DOM, no en Node) — ninguno es
   expresable como array iteration sin perder claridad o sin poder correr
   en el contexto del navegador. */
import { test, expect, Page } from '@playwright/test';
import loginAs from './helpers';

/**
 * FC 074 F5 — Gate_Permanente_RWD_Y_Manifest.
 * Invariante I-RWD: ∀ (módulo, viewport) ∈ dominio (9 módulos × 6
 * viewport-configs = 54 celdas, ver playwright.local.config.ts projects
 * rwd-*): NoHScroll ∧ TouchTargetsOk. Una sola celda en ⊥ rompe el gate
 * (T2, conjunción pura — 074_FC §TABLAS DE VERDAD).
 *
 * A diferencia de e2e/audit/mobileAudit.spec.ts (F1, una sola corrida,
 * NO gatea CI), este spec SÍ falla el build: cada aserción es un assert
 * real, no una recolección de evidencia.
 */

interface ModuleConfig {
  key: string;
  testId: string;
  heading: string;
  byRole?: boolean;
}

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

interface TouchViolation {
  tag: string;
  text: string;
  width: number;
  height: number;
}

/**
 * ALLOWLIST de violaciones de touch-target ya inventariadas y diferidas a
 * K (design:responsive:module-touch-targets, P2 — 074_AN §2/§5). Mismo
 * patrón que el ALLOWLIST de A03 (checkNoRawSql.ts): baja SOLO vía FC
 * firmado cuando el elemento se corrija; alta = evidencia + ítem K. Match
 * por (módulo, texto, ancho, alto) — un cambio de tamaño futuro NO calza
 * el allowlist y rompe el gate a propósito (fuerza re-revisión consciente).
 */
const TOUCH_TARGET_ALLOWLIST: Record<string, TouchViolation[]> = {
  unidades: [{ tag: 'BUTTON', text: '', width: 40, height: 40 }],
  rutas: [
    { tag: 'BUTTON', text: '', width: 40, height: 40 },
    { tag: 'BUTTON', text: '', width: 38, height: 41 },
  ],
  personal: [
    { tag: 'BUTTON', text: '', width: 40, height: 40 },
    { tag: 'BUTTON', text: 'Activo', width: 80, height: 24 },
  ],
  mantenimiento: [
    { tag: 'BUTTON', text: '', width: 40, height: 40 },
    { tag: 'BUTTON', text: '', width: 18, height: 40 },
  ],
  finanzas: [
    { tag: 'BUTTON', text: '15D', width: 36, height: 16 },
    { tag: 'BUTTON', text: '1M', width: 31, height: 16 },
    { tag: 'BUTTON', text: '2M', width: 31, height: 16 },
    { tag: 'BUTTON', text: '3M', width: 31, height: 16 },
    { tag: 'BUTTON', text: '6M', width: 31, height: 16 },
    { tag: 'BUTTON', text: '12M', width: 38, height: 16 },
    { tag: 'BUTTON', text: 'Todo', width: 46, height: 16 },
  ],
  settings: [{ tag: 'BUTTON', text: '', width: 34, height: 34 }],
  admin: [
    { tag: 'BUTTON', text: '', width: 25, height: 28 },
    { tag: 'BUTTON', text: 'Nuevo Rol', width: 127, height: 31 },
    { tag: 'BUTTON', text: 'Guardar', width: 100, height: 26 },
  ],
};

function isAllowlisted(moduleKey: string, v: TouchViolation): boolean {
  const entries = TOUCH_TARGET_ALLOWLIST[moduleKey] ?? [];
  return entries.some(
    (e) => e.tag === v.tag && e.text === v.text && e.width === v.width && e.height === v.height
  );
}

async function waitForNextPaint(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
}

test.describe('FC074 F5 — I-RWD Gate Permanente', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  for (const mod of MODULES) {
    test(`I-RWD: ${mod.key}`, async ({ page }, testInfo) => {
      const viewport = page.viewportSize();
      expect(viewport, 'viewport debe estar definido por el project rwd-*').not.toBeNull();
      const vpWidth = viewport!.width;

      if (vpWidth < 768) {
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

      await waitForNextPaint(page);

      // Scenario 1 — Invariante sin scroll horizontal (I-RWD núcleo).
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(
        scrollWidth,
        `[${testInfo.project.name}/${mod.key}] NoHScroll violado: scrollWidth=${scrollWidth} > viewport=${vpWidth}`
      ).toBeLessThanOrEqual(vpWidth + H_SCROLL_TOLERANCE_PX);

      // Scenario 2/3 — targets táctiles ≥44px solo en primary/nav/acciones visibles.
      const rawViolations: TouchViolation[] = await page.evaluate(
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

      const newViolations = rawViolations.filter((v) => !isAllowlisted(mod.key, v));

      expect(
        newViolations,
        `[${testInfo.project.name}/${
          mod.key
        }] TouchTargetsOk violado (fuera del ALLOWLIST): ${JSON.stringify(newViolations)}`
      ).toEqual([]);
    });
  }
});

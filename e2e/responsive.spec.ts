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

/**
 * FC 075 — I_RWD_Gate_CiFontTolerance_Fix. El ALLOWLIST se calibró en
 * Windows local; el runner de CI (`ubuntu-latest`, Chromium headless) no
 * tiene la fuente de Windows y renderiza botones de texto más angostos
 * (delta máximo observado: 7px, "Nuevo Rol" 127→120, log run 29451993989,
 * job 87476607565). El alto nunca varió entre entornos — la tolerancia
 * aplica SOLO al ancho. Cond.1 Bravo: margen sobre el delta máximo (7px).
 * Cond.5 Bravo: si reaparece un fallo por ancho, recalibrar con un log real
 * nuevo — nunca subir este valor a ciegas.
 */
const WIDTH_TOLERANCE_PX = 10;

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

// Exportada para el test unitario de Cond.2 Bravo (FC 075).
export function isAllowlisted(moduleKey: string, v: TouchViolation): boolean {
  const entries = TOUCH_TARGET_ALLOWLIST[moduleKey] ?? [];
  return entries.some(
    (e) =>
      e.tag === v.tag &&
      e.text === v.text &&
      Math.abs(e.width - v.width) <= WIDTH_TOLERANCE_PX &&
      e.height === v.height
  );
}

/**
 * FC 077 — I_RWD_Gate_Subpixel_Rounding_Fix. Redondeo + filtrado `< 44` +
 * ALLOWLIST viven AQUÍ, en UNA sola función Node unit-testable — el
 * page.evaluate es SOLO recolección de floats crudos (Cond.3 Bravo, sin
 * lógica duplicada en el browser). La comparación evalúa exactamente los
 * mismos enteros que el reporte muestra (simetría medición/reporte, Cond.1
 * Bravo). Antes se comparaban floats crudos y se reportaba redondeado: un
 * botón h-11 renderizado a 43.6px por jitter subpixel de Chromium headless
 * fallaba el gate y el log lo mostraba como "44×44" (3 falsos positivos
 * documentados en K). `Math.round` (half-up) y no floor/ceil: floor
 * seguiría fallando 43.6 (el falso positivo persiste) y ceil aceptaría
 * 43.1 (relajaría el umbral real). MIN_TOUCH_TARGET_PX=44 intacto:
 * 43.4 reales → 43 → FALLA.
 */
export function findTouchViolations(
  measurements: TouchViolation[],
  moduleKey: string
): TouchViolation[] {
  return measurements
    .map((m) => ({ ...m, width: Math.round(m.width), height: Math.round(m.height) }))
    .filter(
      (m) => Math.min(m.width, m.height) < MIN_TOUCH_TARGET_PX && !isAllowlisted(moduleKey, m)
    );
}

test.describe('FC 075 — isAllowlisted (unit, matriz T Cond.2 Bravo)', () => {
  // Entrada de referencia: allowlist tiene width=100,height=26 (mismo tag/text).
  const moduleKey = '__fc075_unit__';
  const originalEntries = TOUCH_TARGET_ALLOWLIST[moduleKey];
  test.beforeAll(() => {
    TOUCH_TARGET_ALLOWLIST[moduleKey] = [{ tag: 'BUTTON', text: 'X', width: 100, height: 26 }];
  });
  test.afterAll(() => {
    if (originalEntries) TOUCH_TARGET_ALLOWLIST[moduleKey] = originalEntries;
    else delete TOUCH_TARGET_ALLOWLIST[moduleKey];
  });

  test('⊤⊤ — ancho dentro de tolerancia (borde N) ∧ alto exacto → Allowlisted', () => {
    const v: TouchViolation = { tag: 'BUTTON', text: 'X', width: 90, height: 26 }; // Δwidth=10=N
    expect(isAllowlisted(moduleKey, v)).toBe(true);
  });

  test('⊤⊥ — ancho dentro de tolerancia ∧ alto distinto → NO Allowlisted', () => {
    const v: TouchViolation = { tag: 'BUTTON', text: 'X', width: 95, height: 27 };
    expect(isAllowlisted(moduleKey, v)).toBe(false);
  });

  test('⊥⊤ — ancho fuera de tolerancia (N+1) ∧ alto exacto → NO Allowlisted', () => {
    const v: TouchViolation = { tag: 'BUTTON', text: 'X', width: 89, height: 26 }; // Δwidth=11=N+1
    expect(isAllowlisted(moduleKey, v)).toBe(false);
  });

  test('⊥⊥ — ancho fuera de tolerancia ∧ alto distinto → NO Allowlisted', () => {
    const v: TouchViolation = { tag: 'BUTTON', text: 'X', width: 50, height: 10 };
    expect(isAllowlisted(moduleKey, v)).toBe(false);
  });
});

test.describe('FC 077 — findTouchViolations (unit, frontera de redondeo Cond.2 Bravo)', () => {
  const mk = (width: number, height: number): TouchViolation => ({
    tag: 'BUTTON',
    text: 'FC077',
    width,
    height,
  });
  // Módulo sin ALLOWLIST — aísla la frontera de redondeo del filtro FC075.
  const MODULE_SIN_ALLOWLIST = 'comando';

  // Dominio expandido Cond.2 Bravo: {43.4, 43.49, 43.5, 43.99, 44.0, 44.5}
  test('43.4 → 43: VIOLACIÓN (déficit real sigue fallando)', () => {
    expect(findTouchViolations([mk(100, 43.4)], MODULE_SIN_ALLOWLIST)).toHaveLength(1);
  });

  test('43.49 → 43: VIOLACIÓN (borde inferior del half-up)', () => {
    expect(findTouchViolations([mk(100, 43.49)], MODULE_SIN_ALLOWLIST)).toHaveLength(1);
  });

  test('43.5 → 44: pasa (jitter subpixel ya no dispara falso positivo)', () => {
    expect(findTouchViolations([mk(100, 43.5)], MODULE_SIN_ALLOWLIST)).toHaveLength(0);
  });

  test('43.99 → 44: pasa (el caso exacto de las 3 ocurrencias del flake)', () => {
    expect(findTouchViolations([mk(100, 43.99)], MODULE_SIN_ALLOWLIST)).toHaveLength(0);
  });

  test('44.0 → 44: pasa (umbral exacto)', () => {
    expect(findTouchViolations([mk(100, 44.0)], MODULE_SIN_ALLOWLIST)).toHaveLength(0);
  });

  test('44.5 → 45: pasa (por encima del umbral)', () => {
    expect(findTouchViolations([mk(100, 44.5)], MODULE_SIN_ALLOWLIST)).toHaveLength(0);
  });

  test('simetría medición/reporte: la violación reporta los MISMOS enteros que evaluó', () => {
    const out = findTouchViolations([mk(43.4, 43.4)], MODULE_SIN_ALLOWLIST);
    expect(out).toEqual([mk(43, 43)]);
  });

  test('interacción ALLOWLIST: allowlisted <44 NO cuenta; no-allowlisted <44 SÍ', () => {
    // 'finanzas' tiene allowlisted {BUTTON, '15D', 36×16} (FC074/075).
    const allowlisted = { tag: 'BUTTON', text: '15D', width: 36.2, height: 16.4 };
    const noAllowlisted = { tag: 'BUTTON', text: 'FC077-nuevo', width: 30, height: 16 };
    const out = findTouchViolations([allowlisted, noAllowlisted], 'finanzas');
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe('FC077-nuevo');
  });
});

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

      // Scenario 2/3 — targets táctiles ≥44px solo en primary/nav/acciones
      // visibles. FC 077: el evaluate SOLO recolecta mediciones crudas
      // (floats de getBoundingClientRect, sin redondear ni filtrar) — toda
      // la lógica de violación vive en findTouchViolations (Node,
      // unit-testable, Cond.3 Bravo).
      const rawMeasurements: TouchViolation[] = await page.evaluate(
        ({ selector }) => {
          const els = Array.from(document.querySelectorAll(selector));
          const measured: { tag: string; text: string; width: number; height: number }[] = [];
          for (const el of els) {
            const rect = (el as HTMLElement).getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue; // no visible en este viewport
            measured.push({
              tag: el.tagName,
              text: (el.textContent || '').trim().slice(0, 40),
              width: rect.width,
              height: rect.height,
            });
          }
          return measured;
        },
        { selector: TOUCH_TARGET_SELECTOR }
      );

      const newViolations = findTouchViolations(rawMeasurements, mod.key);

      expect(
        newViolations,
        `[${testInfo.project.name}/${
          mod.key
        }] TouchTargetsOk violado (fuera del ALLOWLIST): ${JSON.stringify(newViolations)}`
      ).toEqual([]);
    });
  }
});

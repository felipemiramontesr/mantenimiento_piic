/* eslint-disable no-restricted-syntax, no-continue --
   for-loop de generación de tests (dominio 9 módulos) y bucle de medición
   dentro de page.evaluate (ejecuta en el DOM, no en Node) — mismo patrón
   que e2e/responsive.spec.ts (FC 074 F5). */
import { test, expect, Page } from '@playwright/test';
import loginAs from './helpers';

/**
 * FC 078 F4 — Gate_Permanente_NoInternalCollapse.
 *
 * Invariante (complementario a I-RWD, que mide a nivel DOCUMENTO y es ciego
 * al desborde INTERNO — punto ciego confirmado en 078_AN):
 *
 *   ∀ tabla visible en el dominio (9 módulos × projects rwd-*):
 *     VistaDatosOk ≡ CardsActiva ∨ (ScrollReal ∧ Affordance)
 *
 * Operacionalización por tabla visible (si CARDS está activa no hay tabla
 * visible y la celda pasa trivialmente — fila ⊤—— de la tabla T del FC):
 *   1. Primitive : la tabla declara style.minWidth en px (toda tabla del
 *                  dominio nace de ArchonDataTable — F3 eliminó las 5
 *                  artesanales; una tabla sin minWidth es la regresión
 *                  exacta del anti-patrón de 078_AN §1).
 *   2. NoCollapse: ancho real ≥ minWidth declarado (la tabla jamás se
 *                  aplasta al contenedor — el colapso silencioso que
 *                  encimaba encabezados rompe CI para siempre).
 *   3. ScrollReal: si la tabla excede el viewport, vive dentro de un
 *                  contenedor con overflow-x auto/scroll.
 *   4. Affordance: si el contenedor tiene overflow real, al menos un hint
 *                  de SovereignScrollArea (gradiente direccional) es
 *                  visible — el scroll es descubrible, no un secreto.
 *
 * Cond.5 Bravo (FC 078): spec SEPARADA — NO toca e2e/responsive.spec.ts ni
 * findTouchViolations/isAllowlisted; cero asserts cruzados entre projects.
 * Lección FC 077: el page.evaluate SOLO recolecta métricas crudas; TODA la
 * lógica de violación vive en findTableIntegrityViolations (Node,
 * unit-testable) — cero dual-source, simetría medición/reporte.
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

// Tolerancia ±1px por redondeo de scrollbar/subpixel — misma doctrina que
// H_SCROLL_TOLERANCE_PX del gate I-RWD (Cond.3 Bravo FC 074).
export const WIDTH_TOLERANCE_PX = 1;

/** Métricas CRUDAS de una tabla visible — recolectadas en el browser sin lógica. */
export interface TableMeasurement {
  /** data-testid de la tabla (o hint de tag+clases si no declara). */
  id: string;
  /** style.minWidth crudo tal como está en el DOM ('' si no declara). */
  styleMinWidth: string;
  /** getBoundingClientRect().width — float crudo. */
  tableWidth: number;
  /** ¿Existe un ancestro con overflow-x auto/scroll? */
  hasScrollContainer: boolean;
  /** clientWidth/scrollWidth del contenedor de scroll (0 si no hay). */
  containerClientWidth: number;
  containerScrollWidth: number;
  /** ¿Algún hint de SovereignScrollArea visible junto al contenedor? */
  affordanceVisible: boolean;
  /** Ancho del viewport del navegador en esta celda. */
  viewportWidth: number;
}

export interface TableIntegrityViolation {
  id: string;
  kind: 'no-primitive' | 'collapse' | 'no-scroll-container' | 'no-affordance';
  detail: string;
}

const PX_RE = /^\d+(\.\d+)?px$/;

/**
 * Lógica COMPLETA del gate en una función pura Node (lección FC 077): el
 * redondeo, los umbrales y la tabla T de VistaDatosOk viven aquí y se
 * unit-testean abajo. El reporte muestra EXACTAMENTE los valores evaluados.
 */
export function findTableIntegrityViolations(
  tables: TableMeasurement[]
): TableIntegrityViolation[] {
  const out: TableIntegrityViolation[] = [];
  for (const t of tables) {
    // (1) Primitive — sin minWidth px no hay contrato responsive: es la
    // regresión del anti-patrón 078_AN §1 (alta a ALLOWLIST solo vía FC).
    if (!PX_RE.test(t.styleMinWidth.trim())) {
      out.push({
        id: t.id,
        kind: 'no-primitive',
        detail: `style.minWidth='${t.styleMinWidth}' — toda tabla del dominio debe nacer de ArchonDataTable (minWidth real en px)`,
      });
      continue; // sin minWidth, el resto de predicados no es evaluable
    }

    const minWidth = Math.round(Number.parseFloat(t.styleMinWidth));
    const tableWidth = Math.round(t.tableWidth);

    // (2) NoCollapse — la tabla mide su ancho declarado, jamás se aplasta.
    if (tableWidth < minWidth - WIDTH_TOLERANCE_PX) {
      out.push({
        id: t.id,
        kind: 'collapse',
        detail: `tableWidth=${tableWidth} < minWidth=${minWidth} (tolerancia ±${WIDTH_TOLERANCE_PX}px) — colapso 078_AN §1`,
      });
      continue;
    }

    // (3) ScrollReal — si la tabla excede el viewport necesita contenedor
    // de scroll (sin él, el desborde se lo come el layout o sangra).
    if (tableWidth > t.viewportWidth + WIDTH_TOLERANCE_PX && !t.hasScrollContainer) {
      out.push({
        id: t.id,
        kind: 'no-scroll-container',
        detail: `tableWidth=${tableWidth} > viewport=${t.viewportWidth} sin ancestro overflow-x auto/scroll`,
      });
      continue;
    }

    // (4) Affordance — overflow real dentro del contenedor ⇒ hint visible
    // (fila ⊥⊤⊥ de la tabla T: ScrollReal sin Affordance = ⊥).
    const overflow = t.containerScrollWidth - t.containerClientWidth;
    if (t.hasScrollContainer && overflow > WIDTH_TOLERANCE_PX && !t.affordanceVisible) {
      out.push({
        id: t.id,
        kind: 'no-affordance',
        detail: `overflow=${overflow}px sin hint de SovereignScrollArea visible — scroll no descubrible`,
      });
    }
  }
  return out;
}

// ─── Unit tests de la función pura (matriz T VistaDatosOk — Regla 22) ────────

const BASE: TableMeasurement = {
  id: 'unit-table',
  styleMinWidth: '500px',
  tableWidth: 500,
  hasScrollContainer: true,
  containerClientWidth: 328,
  containerScrollWidth: 500,
  affordanceVisible: true,
  viewportWidth: 360,
};

test.describe('FC 078 F4 — findTableIntegrityViolations (unit, tabla T VistaDatosOk)', () => {
  test('⊤—— CardsActiva: dominio sin tablas visibles → cero violaciones', () => {
    expect(findTableIntegrityViolations([])).toEqual([]);
  });

  test('⊥⊤⊤ ScrollReal ∧ Affordance → VistaDatosOk (cero violaciones)', () => {
    expect(findTableIntegrityViolations([BASE])).toEqual([]);
  });

  test('⊥⊤⊥ ScrollReal sin Affordance → no-affordance', () => {
    const out = findTableIntegrityViolations([{ ...BASE, affordanceVisible: false }]);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('no-affordance');
  });

  test('⊥⊥— colapso (tableWidth < minWidth) → collapse, aunque haya scroll', () => {
    const out = findTableIntegrityViolations([{ ...BASE, tableWidth: 328 }]);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('collapse');
  });

  test('tabla sin minWidth px (regresión del anti-patrón) → no-primitive', () => {
    for (const bad of ['', 'auto', '100%', '10rem']) {
      const out = findTableIntegrityViolations([{ ...BASE, styleMinWidth: bad }]);
      expect(out).toHaveLength(1);
      expect(out[0].kind).toBe('no-primitive');
    }
  });

  test('tabla que excede el viewport sin contenedor de scroll → no-scroll-container', () => {
    const out = findTableIntegrityViolations([
      { ...BASE, tableWidth: 500, hasScrollContainer: false, affordanceVisible: false },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('no-scroll-container');
  });

  test('frontera de tolerancia: minWidth−1 pasa, minWidth−2 falla (N / N+1)', () => {
    expect(
      findTableIntegrityViolations([{ ...BASE, tableWidth: 499 }]) // Δ=1=N
    ).toEqual([]);
    expect(
      findTableIntegrityViolations([{ ...BASE, tableWidth: 498 }]) // Δ=2=N+1
    ).toHaveLength(1);
  });

  test('simetría medición/reporte (FC 077): floats crudos se redondean UNA vez', () => {
    // 499.6 → 500 = minWidth → pasa (el reporte jamás mostraría "500 < 500")
    expect(findTableIntegrityViolations([{ ...BASE, tableWidth: 499.6 }])).toEqual([]);
    // overflow ≤ tolerancia no exige affordance
    expect(
      findTableIntegrityViolations([
        { ...BASE, containerScrollWidth: 329, affordanceVisible: false },
      ])
    ).toEqual([]);
  });

  test('sin overflow en el contenedor: la affordance no es exigible', () => {
    expect(
      findTableIntegrityViolations([
        {
          ...BASE,
          tableWidth: 300,
          styleMinWidth: '300px',
          containerClientWidth: 328,
          containerScrollWidth: 328,
          affordanceVisible: false,
        },
      ])
    ).toEqual([]);
  });
});

// ─── Barrido del dominio (9 módulos × project rwd-* actual) ─────────────────

async function waitForNextPaint(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
}

test.describe('FC078 F4 — NoInternalCollapse Gate Permanente', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  for (const mod of MODULES) {
    test(`NoInternalCollapse: ${mod.key}`, async ({ page }, testInfo) => {
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
      if (vpWidth < 768) {
        await page.keyboard.press('Escape'); // cerrar drawer para no medir tablas tapadas
        await waitForNextPaint(page);
      }

      // Recolección CRUDA (cero lógica de gate en el browser — FC 077).
      const measurements: TableMeasurement[] = await page.evaluate((vw) => {
        const out: {
          id: string;
          styleMinWidth: string;
          tableWidth: number;
          hasScrollContainer: boolean;
          containerClientWidth: number;
          containerScrollWidth: number;
          affordanceVisible: boolean;
          viewportWidth: number;
        }[] = [];
        const isVisible = (el: Element): boolean => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };
        // ancestro de scroll horizontal más cercano
        const findScrollContainer = (table: Element): HTMLElement | null => {
          let cur = table.parentElement;
          while (cur && cur !== document.body) {
            const ox = getComputedStyle(cur).overflowX;
            if (ox === 'auto' || ox === 'scroll') return cur;
            cur = cur.parentElement;
          }
          return null;
        };
        // hints de SovereignScrollArea: hermanos del viewport dentro del wrapper
        const hasVisibleAffordance = (container: HTMLElement | null): boolean => {
          if (!container?.parentElement) return false;
          const hints = container.parentElement.querySelectorAll(
            '[data-testid$="-hint-left"], [data-testid$="-hint-right"]'
          );
          return Array.from(hints).some(isVisible);
        };
        for (const table of Array.from(document.querySelectorAll('table'))) {
          if (table.closest('nav, aside, header, footer')) continue;
          if (!isVisible(table)) continue;

          const container = findScrollContainer(table);
          const affordanceVisible = hasVisibleAffordance(container);

          out.push({
            id:
              table.getAttribute('data-testid') ||
              `table.${(table.className || '').split(' ').slice(0, 2).join('.')}`,
            styleMinWidth: table.style.minWidth || '',
            tableWidth: table.getBoundingClientRect().width,
            hasScrollContainer: container !== null,
            containerClientWidth: container ? container.clientWidth : 0,
            containerScrollWidth: container ? container.scrollWidth : 0,
            affordanceVisible,
            viewportWidth: vw,
          });
        }
        return out;
      }, vpWidth);

      const violations = findTableIntegrityViolations(measurements);

      expect(
        violations,
        `[${testInfo.project.name}/${mod.key}] NoInternalCollapse violado: ${JSON.stringify(
          violations
        )}`
      ).toEqual([]);
    });
  }
});

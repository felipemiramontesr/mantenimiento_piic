export interface AffordanceState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

const NO_AFFORDANCE: AffordanceState = { canScrollLeft: false, canScrollRight: false };

/** Calcula qué hints de scroll (izquierda/derecha) deben mostrarse según la
 * posición actual del contenedor. Extraído de `SovereignScrollArea` para que
 * el guard `!el` (el contenedor puede no estar montado aún, o — el caso que
 * este guard realmente protege — un `ResizeObserver`/evento `scroll` en
 * vuelo puede invocar el callback justo después de que React desmonte el
 * componente y limpie el ref) sea una función pura, directamente probable
 * sin simular la carrera de desmontaje en jsdom (FC165 F3 Slice3.1 Batch4,
 * Dual-Gate Isolation — Cond.R Bravo 267_AN: "NO borrar el guard de
 * unmount, test o extraer"). Sin contenedor, no hay nada que desbordar:
 * `NO_AFFORDANCE` es el mismo resultado, en efecto, que dejar el estado sin
 * tocar — ningún hint puede estar visible sin un contenedor real. */
export function computeAffordance(
  el: HTMLElement | null,
  edgeTolerancePx: number
): AffordanceState {
  if (!el) return NO_AFFORDANCE;
  return {
    canScrollLeft: el.scrollLeft > edgeTolerancePx,
    canScrollRight: el.scrollLeft + el.clientWidth < el.scrollWidth - edgeTolerancePx,
  };
}

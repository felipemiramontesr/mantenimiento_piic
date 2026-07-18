import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 🔱 SOVEREIGN SCROLL AREA — FC 078 F1(b) (orden de Ω vía convergencia Alfa)
 * Wrapper REUTILIZABLE de scroll horizontal con affordance integrada:
 * gradientes laterales que aparecen SOLO cuando existe contenido oculto en
 * esa dirección (078_AN P1-1/P1-2: columnas/acciones indescubribles sin
 * indicador). API genérica — tablas, tabs, listas, cualquier contenedor.
 * Cond.2 Bravo: API estable documentada + tests propios de affordance.
 */
export interface SovereignScrollAreaProps {
  children: React.ReactNode;
  /** Clases extra del contenedor scrolleable interno (se suman al overflow). */
  className?: string;
  testId?: string;
}

const EDGE_TOLERANCE_PX = 1; // subpixel de scrollLeft en Chromium

const SovereignScrollArea: React.FC<SovereignScrollAreaProps> = ({
  children,
  className = '',
  testId = 'sovereign-scroll-area',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateAffordance = useCallback((): void => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > EDGE_TOLERANCE_PX);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_TOLERANCE_PX);
  }, []);

  useEffect(() => {
    updateAffordance();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(updateAffordance);
    ro.observe(el);
    // FC 078 F4 — regresión atrapada por el gate NoInternalCollapse: cuando
    // el CONTENIDO crece (datos async llegan a una tabla vacía) el viewport
    // no cambia de tamaño y el observer jamás disparaba — el hint no
    // aparecía con overflow real. Observar también el contenido.
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return (): void => ro.disconnect();
  }, [updateAffordance]);

  return (
    <div className="relative" data-testid={testId}>
      {canScrollLeft && (
        <div
          data-testid={`${testId}-hint-left`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-8 z-30 bg-gradient-to-r from-pinnacle-navy/15 to-transparent"
        />
      )}
      {canScrollRight && (
        <div
          data-testid={`${testId}-hint-right`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 z-30 bg-gradient-to-l from-pinnacle-navy/15 to-transparent"
        />
      )}
      <div
        ref={scrollRef}
        onScroll={updateAffordance}
        className={`overflow-x-auto custom-scrollbar ${className}`}
        data-testid={`${testId}-viewport`}
      >
        {children}
      </div>
    </div>
  );
};

export default SovereignScrollArea;

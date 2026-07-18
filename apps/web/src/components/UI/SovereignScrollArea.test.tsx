import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import SovereignScrollArea from './SovereignScrollArea';

/**
 * FC 078 F1 (Cond.2 Bravo) — tests propios de affordance. jsdom no hace
 * layout (scrollWidth/clientWidth = 0), así que las métricas se definen con
 * Object.defineProperty sobre el viewport y se dispara scroll para que el
 * componente recalcule — se testea la LÓGICA de affordance, no el motor de
 * layout del navegador (eso lo cubre el gate F4 en Chromium real).
 */

const defineMetrics = (
  el: HTMLElement,
  { scrollWidth, clientWidth, scrollLeft }: Record<string, number>
): void => {
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(el, 'scrollLeft', {
    configurable: true,
    value: scrollLeft,
    writable: true,
  });
};

const setup = (): HTMLElement => {
  render(
    <SovereignScrollArea testId="ssa">
      <div style={{ width: 1000 }}>contenido ancho</div>
    </SovereignScrollArea>
  );
  return screen.getByTestId('ssa-viewport');
};

describe('SovereignScrollArea — affordance de scroll (FC 078)', () => {
  it('sin overflow: ningún hint visible', () => {
    const vp = setup();
    defineMetrics(vp, { scrollWidth: 300, clientWidth: 300, scrollLeft: 0 });
    fireEvent.scroll(vp);
    expect(screen.queryByTestId('ssa-hint-left')).toBeNull();
    expect(screen.queryByTestId('ssa-hint-right')).toBeNull();
  });

  it('overflow al inicio: solo hint derecho (hay contenido oculto a la derecha)', async () => {
    const vp = setup();
    defineMetrics(vp, { scrollWidth: 1000, clientWidth: 300, scrollLeft: 0 });
    fireEvent.scroll(vp);
    await waitFor(() => expect(screen.getByTestId('ssa-hint-right')).toBeInTheDocument());
    expect(screen.queryByTestId('ssa-hint-left')).toBeNull();
  });

  it('a medio scroll: ambos hints', async () => {
    const vp = setup();
    defineMetrics(vp, { scrollWidth: 1000, clientWidth: 300, scrollLeft: 350 });
    fireEvent.scroll(vp);
    await waitFor(() => expect(screen.getByTestId('ssa-hint-left')).toBeInTheDocument());
    expect(screen.getByTestId('ssa-hint-right')).toBeInTheDocument();
  });

  it('al final: solo hint izquierdo', async () => {
    const vp = setup();
    defineMetrics(vp, { scrollWidth: 1000, clientWidth: 300, scrollLeft: 700 });
    fireEvent.scroll(vp);
    await waitFor(() => expect(screen.getByTestId('ssa-hint-left')).toBeInTheDocument());
    expect(screen.queryByTestId('ssa-hint-right')).toBeNull();
  });

  it('los hints no interceptan interacción (pointer-events-none) y son aria-hidden', async () => {
    const vp = setup();
    defineMetrics(vp, { scrollWidth: 1000, clientWidth: 300, scrollLeft: 350 });
    fireEvent.scroll(vp);
    const left = await screen.findByTestId('ssa-hint-left');
    expect(left.className).toContain('pointer-events-none');
    expect(left.getAttribute('aria-hidden')).toBe('true');
  });

  it('renderiza children dentro del viewport scrolleable', () => {
    const vp = setup();
    expect(vp.textContent).toContain('contenido ancho');
    expect(vp.className).toContain('overflow-x-auto');
  });
});

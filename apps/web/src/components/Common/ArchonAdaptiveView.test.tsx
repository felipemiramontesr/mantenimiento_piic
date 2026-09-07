import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArchonAdaptiveView from './ArchonAdaptiveView';

/**
 * 🔱 FC 041 Fase A — Contenedor_AdaptiveView_Y_Persistencia
 * T2 InitialView (4 filas) + persistencia localStorage + dominio cerrado.
 */

const STORAGE_KEY = 'archon_adaptive_view_test-module';

const setMatchMediaMobile = (isMobile: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: isMobile,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
};

const renderAdaptive = (views?: {
  CARDS?: React.ReactNode;
  CALENDAR?: React.ReactNode;
  CHARTS?: React.ReactNode;
}): void => {
  render(
    <ArchonAdaptiveView
      storageKey="test-module"
      views={{ TABLE: <div>CONTENIDO TABLA</div>, ...views }}
    />
  );
};

describe('ArchonAdaptiveView (FC 041 Fase A)', () => {
  beforeEach(() => {
    localStorage.clear();
    setMatchMediaMobile(false);
  });

  // ── T2 fila ⊥⊥: sin preferencia + desktop → TABLE ──────────────────────────
  it('renders TABLE view by default on desktop without stored preference', () => {
    renderAdaptive({ CARDS: <div>CONTENIDO TARJETAS</div> });
    expect(screen.getByText('CONTENIDO TABLA')).toBeInTheDocument();
    expect(screen.queryByText('CONTENIDO TARJETAS')).not.toBeInTheDocument();
  });

  // ── T2 fila ⊥⊤: sin preferencia + móvil → CARDS ────────────────────────────
  it('defaults to CARDS on mobile viewport without stored preference', () => {
    setMatchMediaMobile(true);
    renderAdaptive({ CARDS: <div>CONTENIDO TARJETAS</div> });
    expect(screen.getByText('CONTENIDO TARJETAS')).toBeInTheDocument();
  });

  it('stored preference wins over mobile default', () => {
    setMatchMediaMobile(true);
    localStorage.setItem(STORAGE_KEY, 'TABLE');
    renderAdaptive({ CARDS: <div>CONTENIDO TARJETAS</div> });
    expect(screen.getByText('CONTENIDO TABLA')).toBeInTheDocument();
  });

  // FC166 Track C Batch 2 (S5976) — the desktop-preference and dominio-
  // cerrado (FC 071) fallback cases shared the exact same 3-line body,
  // varying only the stored value and expected view; consolidated (0 loss
  // of coverage).
  it.each([
    ['CARDS', 'CONTENIDO TARJETAS'],
    ['MEDIUM', 'CONTENIDO TABLA'],
    ['CHARTS', 'CONTENIDO TABLA'],
  ])('resolves the initial view when the stored preference is %s', (stored, expectedText) => {
    localStorage.setItem(STORAGE_KEY, stored);
    renderAdaptive({ CARDS: <div>CONTENIDO TARJETAS</div> });
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  // ── Botonera: solo vistas provistas ─────────────────────────────────────────
  it('renders selector buttons only for provided views', () => {
    renderAdaptive({ CARDS: <div>CONTENIDO TARJETAS</div> });
    expect(screen.getByTestId('adaptive-view-table')).toBeInTheDocument();
    expect(screen.getByTestId('adaptive-view-cards')).toBeInTheDocument();
    expect(screen.queryByTestId('adaptive-view-calendar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('adaptive-view-charts')).not.toBeInTheDocument();
  });

  // ── Scenario 1 — alternancia + persistencia ─────────────────────────────────
  it('switches view on click and persists the selection to localStorage', () => {
    renderAdaptive({ CARDS: <div>CONTENIDO TARJETAS</div> });
    fireEvent.click(screen.getByTestId('adaptive-view-cards'));
    expect(screen.getByText('CONTENIDO TARJETAS')).toBeInTheDocument();
    expect(screen.queryByText('CONTENIDO TABLA')).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('CARDS');
  });

  it('marks the active view button with aria-pressed', () => {
    renderAdaptive({ CARDS: <div>CONTENIDO TARJETAS</div> });
    expect(screen.getByTestId('adaptive-view-table')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('adaptive-view-cards'));
    expect(screen.getByTestId('adaptive-view-cards')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('adaptive-view-table')).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Las 4 vistas del dominio {TABLE, CARDS, CALENDAR, CHARTS} ──────────────
  it('exercises all four views of the closed domain', () => {
    renderAdaptive({
      CARDS: <div>CONTENIDO TARJETAS</div>,
      CALENDAR: <div>CONTENIDO CALENDARIO</div>,
      CHARTS: <div>CONTENIDO GRAFICOS</div>,
    });
    fireEvent.click(screen.getByTestId('adaptive-view-cards'));
    expect(screen.getByText('CONTENIDO TARJETAS')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('adaptive-view-calendar'));
    expect(screen.getByText('CONTENIDO CALENDARIO')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('adaptive-view-charts'));
    expect(screen.getByText('CONTENIDO GRAFICOS')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('adaptive-view-table'));
    expect(screen.getByText('CONTENIDO TABLA')).toBeInTheDocument();
  });

  // FC 074 F5 — hallazgo del gate I-RWD: los botones del selector medían
  // h-9 (36px), por debajo del mínimo táctil de 44px (Fleet/Users los
  // exponen por defecto; Mantenimiento lo enmascaraba tras otro panel).
  it('AT-FC074-F5-AV-1: los botones del selector usan h-11 (44px) en vez de h-9 (36px)', () => {
    renderAdaptive({ CARDS: <div>CONTENIDO TARJETAS</div> });
    const tableBtn = screen.getByTestId('adaptive-view-table');
    const cardsBtn = screen.getByTestId('adaptive-view-cards');
    expect(tableBtn.className).toMatch(/\bh-11\b/);
    expect(cardsBtn.className).toMatch(/\bh-11\b/);
    expect(tableBtn.className).not.toMatch(/\bh-9\b/);
  });

  // FC 074 F5 — segunda vuelta del gate: <768px el label se oculta
  // (hidden md:inline) y el botón solo-ícono queda angosto (38px < 44px).
  it('AT-FC074-F5-AV-2: los botones del selector garantizan min-w-11 (44px) icon-only <md', () => {
    renderAdaptive({ CARDS: <div>CONTENIDO TARJETAS</div> });
    const tableBtn = screen.getByTestId('adaptive-view-table');
    const cardsBtn = screen.getByTestId('adaptive-view-cards');
    expect(tableBtn.className).toMatch(/\bmin-w-11\b/);
    expect(cardsBtn.className).toMatch(/\bmin-w-11\b/);
  });

  // FC165 F3 Slice3.1 — el fallback `views[activeView] ?? views.TABLE` (línea
  // 95) protege un caso real: si el anfitrión reduce dinámicamente las
  // vistas que provee (p.ej. datos que ya no soportan CARDS) mientras
  // `activeView` sigue apuntando a una vista que YA NO llega en `views`, el
  // estado interno persiste (no se remonta el componente) y `views[activeView]`
  // queda undefined. Se simula shrinking el prop `views` vía `rerender` tras
  // seleccionar CARDS.
  it('falls back to TABLE when the active view disappears from a shrinking views prop', () => {
    const { rerender } = render(
      <ArchonAdaptiveView
        storageKey="test-module"
        views={{ TABLE: <div>CONTENIDO TABLA</div>, CARDS: <div>CONTENIDO TARJETAS</div> }}
      />
    );
    fireEvent.click(screen.getByTestId('adaptive-view-cards'));
    expect(screen.getByText('CONTENIDO TARJETAS')).toBeInTheDocument();

    rerender(
      <ArchonAdaptiveView storageKey="test-module" views={{ TABLE: <div>CONTENIDO TABLA</div> }} />
    );

    expect(screen.getByText('CONTENIDO TABLA')).toBeInTheDocument();
  });
});

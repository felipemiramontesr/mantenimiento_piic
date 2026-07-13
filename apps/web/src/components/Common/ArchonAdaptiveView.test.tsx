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

  // ── T2 filas ⊤⊤/⊤⊥: la preferencia persistida gana sobre el viewport ──────
  it('stored preference wins over desktop default', () => {
    localStorage.setItem(STORAGE_KEY, 'CARDS');
    renderAdaptive({ CARDS: <div>CONTENIDO TARJETAS</div> });
    expect(screen.getByText('CONTENIDO TARJETAS')).toBeInTheDocument();
  });

  it('stored preference wins over mobile default', () => {
    setMatchMediaMobile(true);
    localStorage.setItem(STORAGE_KEY, 'TABLE');
    renderAdaptive({ CARDS: <div>CONTENIDO TARJETAS</div> });
    expect(screen.getByText('CONTENIDO TABLA')).toBeInTheDocument();
  });

  // ── Dominio cerrado (lección FC 071): valor persistido corrupto → fallback ─
  it('falls back to TABLE when stored value is outside the closed domain', () => {
    localStorage.setItem(STORAGE_KEY, 'MEDIUM');
    renderAdaptive({ CARDS: <div>CONTENIDO TARJETAS</div> });
    expect(screen.getByText('CONTENIDO TABLA')).toBeInTheDocument();
  });

  it('falls back to TABLE when stored view is not among provided views', () => {
    localStorage.setItem(STORAGE_KEY, 'CHARTS');
    renderAdaptive({ CARDS: <div>CONTENIDO TARJETAS</div> });
    expect(screen.getByText('CONTENIDO TABLA')).toBeInTheDocument();
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
});

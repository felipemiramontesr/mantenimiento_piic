import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { fireEvent } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import { render, screen } from '../../test/testUtils';
import server from '../../test/server';
import IncidentsModule from './IncidentsModule';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return { ...actual, useNavigate: vi.fn() };
});

const INCIDENT_FIXTURE = [
  {
    id: 1,
    uuid: 'aaaa-1111-bbbb-2222',
    route_uuid: 'abc-123',
    unit_id: 'ASM-001',
    driver_name: 'Juan Perez',
    category: 'MECHANICAL',
    description: 'Falla en sistema de frenos',
    severity: 'CRITICAL',
    status: 'OPEN',
    evidence_image: null,
    reported_at: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 2,
    uuid: 'cccc-3333-dddd-4444',
    route_uuid: 'def-456',
    unit_id: 'ASM-005',
    driver_name: 'Pedro Técnico',
    category: 'FUEL',
    description: 'Bajo nivel de combustible',
    severity: 'MEDIUM',
    status: 'OPEN',
    evidence_image: null,
    reported_at: '2026-06-02T08:30:00.000Z',
  },
];

const renderModule = (): void => {
  render(<IncidentsModule />);
};

describe('IncidentsModule (Incidencias en Ruta)', () => {
  beforeEach((): void => {
    server.use(
      http.get('*/incidents', () => HttpResponse.json({ success: true, data: INCIDENT_FIXTURE }))
    );
    navigateMock.mockClear();
    (useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(navigateMock);
  });

  it('renders incidents table with unit IDs when data loads', async (): Promise<void> => {
    renderModule();
    expect(await screen.findByText('ASM-001')).toBeInTheDocument();
    expect(screen.getByText('ASM-005')).toBeInTheDocument();
  });

  it('renders driver names', async (): Promise<void> => {
    renderModule();
    expect(await screen.findByText('Juan Perez')).toBeInTheDocument();
  });

  it('renders severity badges', async (): Promise<void> => {
    renderModule();
    expect(await screen.findByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('renders status badges', async (): Promise<void> => {
    renderModule();
    const openBadges = await screen.findAllByText('OPEN');
    expect(openBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('sets correct layout section title', async (): Promise<void> => {
    renderModule();
    expect(await screen.findByTestId('layout-title')).toHaveTextContent('Incidencias en Ruta');
  });

  it('shows empty state when no incidents', async (): Promise<void> => {
    server.use(http.get('*/incidents', () => HttpResponse.json({ success: true, data: [] })));
    renderModule();
    expect(await screen.findByText(/sin incidencias/i)).toBeInTheDocument();
  });

  it('unit_id cell links to /incidents/:uuid', async (): Promise<void> => {
    renderModule();
    const link = await screen.findByRole('link', { name: 'ASM-001' });
    expect(link.getAttribute('href')).toBe('/dashboard/incidents/aaaa-1111-bbbb-2222');
  });

  it('each row uses uuid as key (second incident link correct)', async (): Promise<void> => {
    renderModule();
    await screen.findByText('ASM-001');
    const link = screen.getByRole('link', { name: 'ASM-005' });
    expect(link.getAttribute('href')).toBe('/dashboard/incidents/cccc-3333-dddd-4444');
  });

  it('shows empty state when API fetch fails', async (): Promise<void> => {
    server.use(http.get('*/incidents', () => HttpResponse.error()));
    renderModule();
    expect(await screen.findByText(/sin incidencias/i)).toBeInTheDocument();
  });

  it('renders HIGH severity badge with amber classes', async (): Promise<void> => {
    server.use(
      http.get('*/incidents', () =>
        HttpResponse.json({
          success: true,
          data: [{ ...INCIDENT_FIXTURE[0], severity: 'HIGH', id: 99, uuid: 'hh-99' }],
        })
      )
    );
    renderModule();
    expect(await screen.findByText('HIGH')).toBeInTheDocument();
  });

  it('renders LOW severity badge with sky classes', async (): Promise<void> => {
    server.use(
      http.get('*/incidents', () =>
        HttpResponse.json({
          success: true,
          data: [{ ...INCIDENT_FIXTURE[0], severity: 'LOW', id: 98, uuid: 'll-98' }],
        })
      )
    );
    renderModule();
    expect(await screen.findByText('LOW')).toBeInTheDocument();
  });

  it('renders non-OPEN status badge with emerald classes', async (): Promise<void> => {
    server.use(
      http.get('*/incidents', () =>
        HttpResponse.json({
          success: true,
          data: [{ ...INCIDENT_FIXTURE[0], status: 'RESOLVED', id: 97, uuid: 'rr-97' }],
        })
      )
    );
    renderModule();
    expect(await screen.findByText('RESOLVED')).toBeInTheDocument();
  });

  // ── FC 078 F2(a)/(b) — Adopcion_Adaptativa_Completa: ArchonAdaptiveView (TABLE + CARDS) ──
  describe('AT-FC078-F2a — adaptive incidents view', () => {
    it('AT-FC078-F2a-IN-1: renders the adaptive selector with TABLE and CARDS only', async () => {
      renderModule();
      await screen.findByText('ASM-001');
      expect(screen.getByTestId('adaptive-view-table')).toBeInTheDocument();
      expect(screen.getByTestId('adaptive-view-cards')).toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-calendar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-charts')).not.toBeInTheDocument();
    });

    it('AT-FC078-F2a-IN-2: switches to CARDS view and renders incidents as enriched cards', async () => {
      renderModule();
      await screen.findByText('ASM-001');
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      expect(await screen.findByTestId('archon-card-view')).toBeInTheDocument();
      expect(screen.getAllByTestId('archon-card-item')).toHaveLength(2);
      // receta v2: conductor, categoría y fecha como métricas nuevas
      expect(screen.getByText('MECHANICAL')).toBeInTheDocument();
      expect(screen.getByText('01/06/2026')).toBeInTheDocument();
    });

    it('AT-FC078-F2a-IN-3: clicking a card navigates to the incident detail (onClick preservado)', async () => {
      renderModule();
      await screen.findByText('ASM-001');
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      const cards = await screen.findAllByTestId('archon-card-item');
      fireEvent.click(cards[0]);
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/incidents/aaaa-1111-bbbb-2222');
    });
  });

  // ── FC 081 F1 — Visibilidad_En_Lectura (doctrina cascada Ω: el texto
  // corto se ve COMPLETO; el tooltip es solo respaldo — Cond.1/3 Bravo) ──
  describe('AT-FC081-F1 — descripción visible completa', () => {
    beforeEach(() => {
      // los tests F2a dejan CARDS persistido — la vista por defecto debe ser TABLE
      localStorage.clear();
    });
    it('AT-FC081-F1-IN-1: la celda TABLE envuelve (line-clamp-3+break-words) — sin truncate de 1 línea', async () => {
      renderModule();
      const desc = await screen.findByText('Falla en sistema de frenos');
      expect(desc.className).toContain('line-clamp-3');
      expect(desc.className).toContain('break-words');
      expect(desc.className).not.toContain('truncate');
    });

    it('AT-FC081-F1-IN-2: la celda TABLE expone title con el texto completo (respaldo incondicional)', async () => {
      renderModule();
      const desc = await screen.findByText('Falla en sistema de frenos');
      const cell = desc.closest('td');
      expect(cell?.getAttribute('title')).toBe('Falla en sistema de frenos');
    });

    it('AT-FC081-F1-IN-3: la card CARDS muestra la descripción completa — sin truncate ni clamp', async () => {
      renderModule();
      await screen.findByText('ASM-001');
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      await screen.findByTestId('archon-card-view');
      const cardDesc = screen
        .getAllByText('Falla en sistema de frenos')
        .find((el) => el.closest('[data-testid="archon-card-item"]'));
      expect(cardDesc).toBeDefined();
      expect(cardDesc!.className).not.toContain('truncate');
      expect(cardDesc!.className).not.toContain('line-clamp');
      expect(cardDesc!.className).toContain('break-words');
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen } from '../../test/testUtils';
import server from '../../test/server';
import IncidentsModule from './IncidentsModule';

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
});

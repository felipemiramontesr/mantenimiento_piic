import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ArchonCenter from './ArchonCenter';
import { FleetProvider } from '../../context/FleetContext';

import { UserProvider } from '../../context/UserContext';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    post: vi.fn(),
  },
}));

describe('ArchonCenter Component (Sovereign Dashboard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders branding name and command titles', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <UserProvider>
            <FleetProvider>
              <ArchonCenter />
            </FleetProvider>
          </UserProvider>
        </BrowserRouter>
      );
    });

    expect(screen.getByText('Centro de Comando')).toBeDefined();
    expect(screen.getByText('Análisis Predictivo de Segmentos Operativos')).toBeDefined();
    expect(screen.getByText('Archon')).toBeDefined();
  });

  it('renders all 6 KPI cards with correct text in Spanish', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <UserProvider>
            <FleetProvider>
              <ArchonCenter />
            </FleetProvider>
          </UserProvider>
        </BrowserRouter>
      );
    });

    expect(screen.getByText(/Salud de Flota/i)).toBeDefined();
    expect(screen.getByText(/Activos Totales/i)).toBeDefined();
    expect(screen.getAllByText(/Disponibilidad/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Despliegue en Ruta/i)).toBeDefined();
    expect(screen.getAllByText(/Mantenimiento/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Mermas Operativas/i)).toBeDefined();

    // Verify visibility of action buttons with a robust ARIA role matcher
    const detailButtons = screen.getAllByRole('button', { name: /VER REPORTE/i });
    expect(detailButtons.length).toBe(6);
  });

  it('renders the 3 main category cards with 2x2 grid', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <UserProvider>
            <FleetProvider>
              <ArchonCenter />
            </FleetProvider>
          </UserProvider>
        </BrowserRouter>
      );
    });

    expect(screen.getByText('Vehículos de Flota')).toBeDefined();
    expect(screen.getByText('Maquinaria Pesada')).toBeDefined();
    expect(screen.getByText('Herramienta Menor')).toBeDefined();

    expect(screen.getAllByText(/Segmento Operativo/i).length).toBe(3);
  });
});

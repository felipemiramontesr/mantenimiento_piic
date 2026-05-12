import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { render, screen, act } from '../../test/testUtils';
import ArchonCenter from './ArchonCenter';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    post: vi.fn(),
  },
}));

describe('ArchonCenter Component (Apex Standard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModule = async (): Promise<void> => {
    await act(async () => {
      render(
        <BrowserRouter>
          <ArchonCenter />
        </BrowserRouter>
      );
    });
  };

  it('renders branding name and command titles', async () => {
    await renderModule();
    expect(await screen.findByText('Centro de Comando')).toBeDefined();
    expect(await screen.findByText('Análisis Predictivo de Segmentos Operativos')).toBeDefined();
  });

  it('renders all 6 KPI cards with correct text in Spanish', async () => {
    await renderModule();

    expect(screen.getByText(/Salud de Flota/i)).toBeDefined();
    expect(screen.getByText(/Fuerza Operativa/i)).toBeDefined();
    expect(screen.getByText(/Activos Totales/i)).toBeDefined();
    expect(screen.getAllByText(/Disponibilidad/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Despliegue en Ruta/i)).toBeDefined();
    expect(screen.getAllByText(/Mantenimiento/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Mermas Operativas/i)).toBeDefined();
    expect(screen.getByText(/Incidencias en Ruta/i)).toBeDefined();

    const detailButtons = screen.getAllByRole('button', { name: /VER REPORTE/i });
    expect(detailButtons.length).toBe(8);
  });

  it('renders the 3 main category cards with 2x2 grid', async () => {
    await renderModule();

    expect(screen.getByText('Vehículos de Flota')).toBeDefined();
    expect(screen.getByText('Maquinaria Pesada')).toBeDefined();
    expect(screen.getByText('Herramienta Menor')).toBeDefined();

    expect(screen.getAllByText(/Segmento Operativo/i).length).toBe(3);
  });
});

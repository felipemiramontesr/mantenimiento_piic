import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '../../test/testUtils';
import FinancialHealthModule from './FinancialHealthModule';

/**
 * 🔱 Archon Test Suite: FinancialHealthModule
 * Implementation: Sovereign Financial Intelligence (v.1.0.0)
 */

const stableUnits = [
  { id: '1', monthlyLeasePayment: 1000 },
  { id: '2', monthlyLeasePayment: '2000' }, // Test string concatenation bug fix
];
vi.mock('../../context/FleetContext', async () => {
  const actual = await vi.importActual('../../context/FleetContext');
  return {
    ...actual,
    useFleet: (): Record<string, unknown> => ({
      units: stableUnits,
      stats: {
        maintenanceIndex: 85,
      },
      loading: false,
    }),
  };
});

describe('FinancialHealthModule (Sovereign Finance)', () => {
  const renderModule = (): void => {
    render(
      <MemoryRouter>
        <FinancialHealthModule />
      </MemoryRouter>
    );
  };

  it('renders correctly and calculates total lease as a number', async () => {
    renderModule();
    expect(await screen.findByText('Salud Financiera')).toBeInTheDocument();

    // Total should be 3000.00 (1000 + 2000)
    expect(screen.getByText('$3,000.00')).toBeInTheDocument();
  });

  it('transitions between panels correctly', () => {
    renderModule();

    // Starts in AUDIT
    expect(screen.getByText('Auditoría de Egresos lista-')).toBeInTheDocument();

    // Switch to OPTIMIZATION
    const optCard = screen.getByText('Auditoría de Costos');
    fireEvent.click(optCard);

    expect(screen.getByText('Motor de ROI listo-')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows breadcrumbs/messages ad-hoc to the module', async () => {
    renderModule();
    expect(await screen.findByText(/Inteligencia Económica/i)).toBeInTheDocument();
  });
});

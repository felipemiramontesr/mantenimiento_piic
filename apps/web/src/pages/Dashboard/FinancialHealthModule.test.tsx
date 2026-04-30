import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import FinancialHealthModule from './FinancialHealthModule';
import { FleetProvider } from '../../context/FleetContext';

/**
 * 🔱 Archon Test Suite: FinancialHealthModule
 * Implementation: Sovereign Financial Intelligence (v.1.0.0)
 */

// Mock specialized context
vi.mock('../../context/FleetContext', async () => {
  const actual = await vi.importActual('../../context/FleetContext');
  return {
    ...actual,
    useFleet: (): Record<string, unknown> => ({
      units: [
        { id: '1', monthlyLeasePayment: 1000 },
        { id: '2', monthlyLeasePayment: '2000' }, // Test string concatenation bug fix
      ],
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
        <FleetProvider>
          <FinancialHealthModule />
        </FleetProvider>
      </MemoryRouter>
    );
  };

  it('renders correctly and calculates total lease as a number', () => {
    renderModule();
    expect(screen.getByText('Salud Financiera')).toBeInTheDocument();

    // Total should be 3000.00 (1000 + 2000)
    // If bug existed, it would be "010002000" or similar
    expect(screen.getByText('$3,000.00')).toBeInTheDocument();
  });

  it('transitions between panels correctly', () => {
    renderModule();

    // Starts in AUDIT
    expect(screen.getByText('Auditoría de Egresos lista-')).toBeInTheDocument();

    // Switch to OPTIMIZATION
    const optCard = screen.getByText('Optimización de ROI');
    fireEvent.click(optCard);

    expect(screen.getByText('Motor de ROI listo-')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows breadcrumbs/messages ad-hoc to the module', () => {
    renderModule();
    expect(screen.getByText(/Inteligencia Económica/i)).toBeInTheDocument();
  });
});

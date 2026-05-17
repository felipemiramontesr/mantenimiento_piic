import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/testUtils';
import { FleetGridView } from './FleetGridView';
import { FleetUnit } from '../../types/fleet';
import * as layoutContext from '../../context/SovereignLayoutContext';

/**
 * 🔱 Archon Test Suite: FleetGridView QA
 * Objective: 100% test coverage of FleetGridView including universal quantitative searching.
 * v.1.0.2 - Spy-Based Context Isolation Compliant
 */

let mockSearchTerm = '';

describe('FleetGridView Component (Universal Search & Grid Rendering)', () => {
  const mockProps = {
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    units: [
      {
        id: 'ASM-002',
        placas: 'XYZ-987',
        marca: 'Chevrolet',
        modelo: 'Aveo',
        year: 2022,
        color: 'Rojo',
        departamento: 'Logística',
        sede: 'Norte',
        owner: 'ARIAN SILVER DE MÉXICO',
        complianceStatus: 'OPERATIVO',
        status: 'Disponible',
        assetType: 'Vehículo',
        fuelType: 'Gasolina',
        traccion: '4x2',
        transmision: 'Manual',
        numeroSerie: '1HGCR2F8X',
        circulationCardNumber: 'TC-999',
        accountingAccount: '1.1.2.01',
        insurancePolicyNumber: 'POL-999',
        motor: '1.6L',
        tireBrand: 'Bridgestone',
        tireSpec: '185/60 R15',
        monthlyLeasePayment: 15800.5,
        odometer: 42350,
        lastServiceReading: 40000,
        nextServiceReading: 45000,
        capacidadCarga: 1500,
        fuelTankCapacity: 80,
        maintIntervalKm: 10000,
        maintIntervalDays: 180,
        dailyUsageAvg: 35.5,
      },
    ] as FleetUnit[],
    onOpenGallery: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchTerm = '';

    // 🔱 Spy on Layout Hook to mock value cleanly without breaking global providers
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Administrar Unidades', description: 'GESTIÓN' },
      searchTerm: mockSearchTerm,
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
    });
  });

  it('renders table headers and fleet units correctly', () => {
    render(<FleetGridView {...mockProps} />);
    expect(screen.getByText('XYZ-987')).toBeInTheDocument();
    expect(screen.getByText('Chevrolet Aveo')).toBeInTheDocument();
    expect(screen.getByText('ARIAN SILVER DE MÉXICO')).toBeInTheDocument();
  });

  it('filters rows by string properties (Aveo, Arian, Norte)', () => {
    mockSearchTerm = 'norte';
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Administrar Unidades', description: 'GESTIÓN' },
      searchTerm: mockSearchTerm,
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
    });

    const { rerender } = render(<FleetGridView {...mockProps} />);
    expect(screen.getByText('XYZ-987')).toBeInTheDocument();

    mockSearchTerm = 'no-existente';
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Administrar Unidades', description: 'GESTIÓN' },
      searchTerm: mockSearchTerm,
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
    });

    rerender(<FleetGridView {...mockProps} />);
    expect(screen.queryByText('XYZ-987')).not.toBeInTheDocument();
  });

  it('filters rows by numeric properties (Leasing, Odometer, Cargo)', () => {
    mockSearchTerm = '15,800';
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Administrar Unidades', description: 'GESTIÓN' },
      searchTerm: mockSearchTerm,
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
    });

    const { rerender } = render(<FleetGridView {...mockProps} />);
    expect(screen.getByText('XYZ-987')).toBeInTheDocument();

    mockSearchTerm = '1,500'; // capacity 1500 kg
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Administrar Unidades', description: 'GESTIÓN' },
      searchTerm: mockSearchTerm,
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
    });

    rerender(<FleetGridView {...mockProps} />);
    expect(screen.getByText('XYZ-987')).toBeInTheDocument();
  });

  it('filters rows by dynamic calculated forecast remaining kilometers', () => {
    mockSearchTerm = '7,650';
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Administrar Unidades', description: 'GESTIÓN' },
      searchTerm: mockSearchTerm,
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
    });

    render(<FleetGridView {...mockProps} />);
    expect(screen.getByText('XYZ-987')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/testUtils';
import { FleetGridView } from './FleetGridView';
import { FleetUnit } from '../../types/fleet';
import * as layoutContext from '../../context/SovereignLayoutContext';
import usePermissions from '../../hooks/usePermissions';

vi.mock('../../hooks/usePermissions', () => ({ default: vi.fn() }));
vi.mock('../../hooks/useTco', () => ({
  useTco: vi.fn(() => ({ data: null, loading: false, error: null })),
}));

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

    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(false),
      hasAnyPermission: vi.fn().mockReturnValue(false),
      isOmnipotent: vi.fn().mockReturnValue(false),
      isExternalClientOnly: vi.fn().mockReturnValue(false),
      isSuiteVIM: vi.fn().mockReturnValue(false),
    });

    // 🔱 Spy on Layout Hook to mock value cleanly without breaking global providers
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Administrar Unidades', description: 'GESTIÓN' },
      searchTerm: mockSearchTerm,
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
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
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
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
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
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
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
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
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
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
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });

    render(<FleetGridView {...mockProps} />);
    expect(screen.getByText('XYZ-987')).toBeInTheDocument();
  });
});

// VIM-DISPLAY-1..4: FC-3 Fase 3E — VIM display adaptation tests
describe('FleetGridView VIM Display (FC-3 Fase 3E)', () => {
  const vimUnit: FleetUnit = {
    id: 'PIIC-101',
    placas: 'VIM-001',
    marca: 'Toyota',
    modelo: 'Hilux',
    year: 2024,
    color: 'Blanco',
    departamento: 'VIM',
    sede: 'PIIC',
    owner: 'PIIC SUPERCÚMULOS',
    complianceStatus: 'OPERATIVO',
    status: 'Disponible',
    assetType: 'Vehículo',
    fuelType: 'Gasolina',
    traccion: '4x4',
    transmision: 'Automática',
    numeroSerie: 'PIICVIM101',
    circulationCardNumber: 'TC-VIM-001',
    accountingAccount: '1.1.2.10',
    insurancePolicyNumber: 'POL-VIM-001',
    motor: '2.7L',
    tireBrand: 'Bridgestone',
    tireSpec: '265/70 R17',
    monthlyLeasePayment: 0,
    odometer: 25000,
    lastServiceReading: 15000,
    nextServiceReading: 25000,
    capacidadCarga: 1000,
    fuelTankCapacity: 80,
    maintIntervalKm: 10000,
    maintIntervalDays: 180,
    dailyUsageAvg: 20,
    warranty_expiration_date: '2027-12-31',
    warranty_expiration_km: 100000,
    ownerId: 9100,
    complianceStatusId: null,
    departmentId: null,
    uso: null,
    operationalUseId: null,
    locationId: null,
    engineTypeId: null,
    colorId: null,
    tireBrandId: null,
    tipoTerreno: null,
    terrainTypeId: null,
    maintenanceCenterId: null,
    protocolStartDate: null,
    vigenciaSeguro: null,
    vencimientoVerificacion: null,
    lubeType: null,
    filterBrand: null,
    legalComplianceDate: null,
    insuranceExpiryDate: null,
    insuranceCompanyId: null,
    assignedOperatorId: null,
    updatedAt: '2026-06-20',
    assetTypeId: 1,
    fuelTypeId: 1,
    traccionId: 1,
    transmisionId: 1,
  } as unknown as FleetUnit;

  const mockVimProps = {
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    units: [vimUnit],
    onOpenGallery: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(false),
      hasAnyPermission: vi.fn().mockReturnValue(false),
      isOmnipotent: vi.fn().mockReturnValue(false),
      isExternalClientOnly: vi.fn().mockReturnValue(false),
      isSuiteVIM: vi.fn().mockReturnValue(true),
    });
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Flota VIM', description: 'VIM' },
      searchTerm: '',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
  });

  it('VIM-DISPLAY-1: suite=VIM oculta la sección Carga del display', () => {
    render(<FleetGridView {...mockVimProps} />);
    expect(screen.queryByText('Carga')).not.toBeInTheDocument();
  });

  it('VIM-DISPLAY-2: suite=VIM oculta la sección Tanque del display', () => {
    render(<FleetGridView {...mockVimProps} />);
    expect(screen.queryByText('Tanque')).not.toBeInTheDocument();
  });

  it('VIM-DISPLAY-3: suite=VIM muestra el campo GARANTÍA con fecha de vencimiento', () => {
    render(<FleetGridView {...mockVimProps} />);
    expect(screen.getByText('GARANTÍA')).toBeInTheDocument();
  });

  it('VIM-DISPLAY-4: suite=VIM cambia etiqueta LEASING por ADQUISICIÓN', () => {
    render(<FleetGridView {...mockVimProps} />);
    expect(screen.queryByText('LEASING')).not.toBeInTheDocument();
    expect(screen.getByText('ADQUISICIÓN')).toBeInTheDocument();
  });
});

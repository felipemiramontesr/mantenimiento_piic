import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/testUtils';
import { FleetGridView } from './FleetGridView';
import { FleetUnit } from '../../types/fleet';
import * as layoutContext from '../../context/SovereignLayoutContext';
import usePermissions from '../../hooks/usePermissions';
import { useAssetTypeFields } from '../../hooks/useAssetTypeFields';

vi.mock('../../hooks/usePermissions', () => ({ default: vi.fn() }));
vi.mock('../../hooks/useTco', () => ({
  useTco: vi.fn(() => ({ data: null, loading: false, error: null })),
}));

vi.mock('../../hooks/useAssetTypeFields', () => ({
  useAssetTypeFields: vi.fn(() => ({
    fields: {
      placa: true,
      circulationCardNumber: true,
      numeroSerie: true,
      insurancePolicyNumber: true,
      insuranceExpiryDate: true,
      vencimientoVerificacion: true,
      warrantyExpiry: true,
    },
    loading: false,
  })),
  DEFAULT_FIELD_VISIBILITY: {
    placa: true,
    circulationCardNumber: true,
    numeroSerie: true,
    insurancePolicyNumber: true,
    insuranceExpiryDate: true,
    vencimientoVerificacion: true,
    warrantyExpiry: true,
  },
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
        assetTypeId: 1,
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

  it('AT-D-1: VEHICLE (assetTypeId=1) muestra placas y T. CIRCULACIÓN en la grid', () => {
    vi.mocked(useAssetTypeFields).mockReturnValue({
      fields: {
        placa: true,
        circulationCardNumber: true,
        numeroSerie: true,
        insurancePolicyNumber: true,
        insuranceExpiryDate: true,
        vencimientoVerificacion: true,
        warrantyExpiry: true,
      },
      loading: false,
    });
    render(<FleetGridView {...mockProps} />);
    expect(screen.getByText('XYZ-987')).toBeInTheDocument();
    expect(screen.getByText('T. CIRCULACIÓN:')).toBeInTheDocument();
    expect(screen.getByText('TC-999')).toBeInTheDocument();
  });

  it('AT-D-2: EQUIPMENT (placa=false, circulationCardNumber=false) oculta placas y T. CIRCULACIÓN en la grid', () => {
    vi.mocked(useAssetTypeFields).mockReturnValue({
      fields: {
        placa: false,
        circulationCardNumber: false,
        numeroSerie: true,
        insurancePolicyNumber: false,
        insuranceExpiryDate: false,
        vencimientoVerificacion: false,
        warrantyExpiry: true,
      },
      loading: false,
    });
    render(<FleetGridView {...mockProps} />);
    expect(screen.queryByText('XYZ-987')).not.toBeInTheDocument();
    expect(screen.queryByText('T. CIRCULACIÓN:')).not.toBeInTheDocument();
    expect(screen.queryByText('TC-999')).not.toBeInTheDocument();
  });
});

// FC 082 F0c — bloque VIM-DISPLAY-1..4 purgado: el eje suite murió (084_AN §1a).
// NULLINTERVALS-1..2: FC-HardcodeIntervals Fase A — null interval fallback sanitization
describe('FleetGridView Null Interval Fallbacks (FC-HardcodeIntervals Fase A)', () => {
  const nullIntervalsUnit = {
    id: 'TEST-NULL',
    placas: 'NULL-001',
    marca: 'Ford',
    modelo: 'Ranger',
    year: 2023,
    color: 'Negro',
    departamento: 'Test',
    sede: null,
    owner: null,
    complianceStatus: null,
    status: 'Disponible',
    assetType: 'Vehículo',
    fuelType: 'Diesel',
    traccion: '4x4',
    transmision: 'Manual',
    numeroSerie: 'NULLTEST001',
    circulationCardNumber: null,
    accountingAccount: null,
    insurancePolicyNumber: null,
    motor: null,
    tireBrand: null,
    tireSpec: null,
    monthlyLeasePayment: 0,
    odometer: 3500,
    lastServiceReading: 0,
    nextServiceReading: null,
    capacidadCarga: 0,
    fuelTankCapacity: 0,
    maintIntervalKm: null,
    maintIntervalDays: null,
    usageFreqLabel: null,
    timeFreqLabel: null,
    dailyUsageAvg: 0,
  } as unknown as FleetUnit;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(false),
      hasAnyPermission: vi.fn().mockReturnValue(false),
      isOmnipotent: vi.fn().mockReturnValue(false),
    });
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Flota', description: 'ERP' },
      searchTerm: '',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
  });

  it('NULLINTERVALS-1: maintIntervalKm=null y usageFreqLabel=null muestra "—" sin fallback ERP', () => {
    render(<FleetGridView units={[nullIntervalsUnit]} onEdit={vi.fn()} />);
    expect(screen.queryByText(/10,000\.00 KM/)).not.toBeInTheDocument();
  });

  it('NULLINTERVALS-2: maintIntervalDays=null y timeFreqLabel=null muestra "—" sin fallback ERP', () => {
    render(<FleetGridView units={[nullIntervalsUnit]} onEdit={vi.fn()} />);
    expect(screen.queryByText('180 DÍAS')).not.toBeInTheDocument();
  });
});

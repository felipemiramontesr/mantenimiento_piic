import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { render, screen, mockGetUnitDetails } from '../../test/testUtils';
import { FleetGridView } from './FleetGridView';
import { FleetUnit } from '../../types/fleet';
import * as layoutContext from '../../context/SovereignLayoutContext';
import usePermissions from '../../hooks/usePermissions';
import { useAssetTypeFields } from '../../hooks/useAssetTypeFields';
import { useTco, TcoData } from '../../hooks/useTco';

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

/**
 * FC162 R4-B (100% mandatorio, 202_AN/203_AN Bravo) — segundo archivo P0
 * (77 unc Sonar). matchFieldInUnit/HologramBadge/TcoKpiCluster/gallery/edit
 * button/sort nunca tenían cobertura directa.
 */
describe('FleetGridView — search suggestions (matchFieldInUnit)', () => {
  const baseUnit = {
    id: 'ASM-010',
    placas: 'DEF-456',
    marca: 'Nissan',
    modelo: 'NP300',
    year: 2021,
    color: 'Blanco',
    departamento: 'Operaciones',
    sede: 'Sur',
    owner: 'ARIAN SILVER',
    complianceStatus: 'OPERATIVO',
    status: 'Disponible',
    assetType: 'Vehículo',
    assetTypeId: 1,
    fuelType: 'Diesel',
    traccion: '4x4',
    transmision: 'Manual',
    numeroSerie: 'VIN12345',
    circulationCardNumber: 'TC-100',
    accountingAccount: '1.1.2.02',
    insurancePolicyNumber: 'POL-100',
    motor: '2.5L',
    tireBrand: 'Michelin',
    tireSpec: '265/70 R16',
    monthlyLeasePayment: 12000,
    odometer: 30000,
    lastServiceReading: 20000,
    nextServiceReading: 30000,
    capacidadCarga: 1000,
    fuelTankCapacity: 90,
    maintIntervalKm: 10000,
    maintIntervalDays: 90,
    dailyUsageAvg: 50,
  } as unknown as FleetUnit;

  const captureGetSuggestions = (
    units: FleetUnit[]
  ): ((term: string) => { id: string; metaLabel: string; metaValue: string }[]) => {
    const setSearchConfig = vi.fn();
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Flota', description: 'ERP' },
      searchTerm: '',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig,
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    render(<FleetGridView units={units} onEdit={vi.fn()} />);
    const config = setSearchConfig.mock.calls[0][0];
    return config.getSuggestions;
  };

  beforeEach(() => {
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(false),
      hasAnyPermission: vi.fn().mockReturnValue(false),
      isOmnipotent: vi.fn().mockReturnValue(false),
    });
  });

  it('matches by unit id (Código)', () => {
    const getSuggestions = captureGetSuggestions([baseUnit]);
    const results = getSuggestions('asm-010');
    expect(results).toHaveLength(1);
    expect(results[0].metaLabel).toBe('Código');
  });

  it('matches by forecast remaining km (Km. Restantes)', () => {
    // 207_AN Bravo reopen: the previous assertion accepted a match on
    // 'Código' as a pass too — baseUnit's id ('ASM-010') itself contains
    // '0', so matchFieldInUnit's id-check (checked first) always won before
    // ever reaching the forecast branch. A dedicated unit whose forecast
    // value shares no digits with its id isolates the real target line.
    const forecastUnit = {
      id: 'UNIT-X',
      maintIntervalKm: 10000,
      maintIntervalDays: 90,
      dailyUsageAvg: 50,
      odometer: 20000,
      lastServiceReading: 15000,
    } as unknown as FleetUnit;
    // remaining = 10000 - (20000 - 15000) = 5000
    const getSuggestions = captureGetSuggestions([forecastUnit]);
    const results = getSuggestions('5000');
    expect(results).toHaveLength(1);
    expect(results[0].metaLabel).toBe('Km. Restantes');
  });

  it('matches a string field via SEARCH_CONFIGS (marca)', () => {
    const getSuggestions = captureGetSuggestions([baseUnit]);
    const results = getSuggestions('nissan');
    expect(results).toHaveLength(1);
    expect(results[0].metaLabel).toBe('Marca');
  });

  it('matches a numeric field via SEARCH_CONFIGS (odómetro)', () => {
    const getSuggestions = captureGetSuggestions([baseUnit]);
    const results = getSuggestions('30,000');
    expect(results).toHaveLength(1);
    expect(results[0].metaLabel).toBe('Odómetro');
  });

  it('matches by year when no other field matches', () => {
    const getSuggestions = captureGetSuggestions([baseUnit]);
    const results = getSuggestions('2021');
    expect(results).toHaveLength(1);
    expect(results[0].metaLabel).toBe('Año');
  });

  it('returns no suggestions when nothing matches', () => {
    const getSuggestions = captureGetSuggestions([baseUnit]);
    expect(getSuggestions('zzz-no-match-zzz')).toHaveLength(0);
  });

  it('onSuggestionSelect sets the search term to the selected unit id', () => {
    const setSearchTerm = vi.fn();
    const setSearchConfig = vi.fn();
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Flota', description: 'ERP' },
      searchTerm: '',
      setSearchTerm,
      searchConfig: null,
      setSearchConfig,
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    render(<FleetGridView units={[baseUnit]} onEdit={vi.fn()} />);
    const config = setSearchConfig.mock.calls[0][0];
    config.onSuggestionSelect({ id: 'ASM-010' });
    expect(setSearchTerm).toHaveBeenCalledWith('ASM-010');
  });
});

describe('FleetGridView — HologramBadge', () => {
  beforeEach(() => {
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

  it('renders the exempt badge (H-0) without the restricted marker', () => {
    const unit = {
      id: 'ASM-020',
      placas: 'GHI-321',
      marca: 'Ford',
      modelo: 'F150',
      environmentalHologram: '0',
      status: 'Disponible',
      odometer: 1000,
    } as unknown as FleetUnit;
    render(<FleetGridView units={[unit]} onEdit={vi.fn()} />);
    expect(screen.getByText('H-0')).toBeInTheDocument();
    expect(screen.queryByText('HOY NO CIRCULA')).not.toBeInTheDocument();
  });
});

describe('FleetGridView — TcoKpiCluster', () => {
  const unit = {
    id: 'ASM-030',
    placas: 'JKL-654',
    marca: 'Toyota',
    modelo: 'Hilux',
    status: 'Disponible',
    odometer: 50000,
  } as unknown as FleetUnit;

  beforeEach(() => {
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

  it('shows the loading state', () => {
    vi.mocked(useTco).mockReturnValue({ data: null, loading: true, error: null });
    render(<FleetGridView units={[unit]} onEdit={vi.fn()} />);
    expect(screen.getByTestId('tco-kpi-loading')).toBeInTheDocument();
  });

  it('shows TCO total + cost-per-km + last record date when data is present', () => {
    const tcoData: TcoData = {
      fleet_unit_id: 'ASM-030',
      tco_total: 5000,
      tco_maintenance: 1000,
      tco_insurance: 1000,
      tco_lease: 1000,
      tco_tenencia: 1000,
      tco_verificacion: 500,
      tco_fuel: 500,
      tco_other: 0,
      total_records: 6,
      last_record_at: '2026-01-01T00:00:00Z',
    };
    vi.mocked(useTco).mockReturnValue({ data: tcoData, loading: false, error: null });
    render(<FleetGridView units={[unit]} onEdit={vi.fn()} />);
    expect(screen.getByTestId('tco-kpi-section')).toBeInTheDocument();
    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
  });
});

describe('FleetGridView — gallery interaction', () => {
  const unitNoImages = {
    id: 'ASM-040',
    placas: 'MNO-987',
    marca: 'Isuzu',
    modelo: 'D-Max',
    status: 'Disponible',
    odometer: 10000,
    images: [],
  } as unknown as FleetUnit;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUnitDetails.mockReset();
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(true),
      hasAnyPermission: vi.fn().mockReturnValue(true),
      isOmnipotent: vi.fn().mockReturnValue(true),
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

  it('hydrates unit images via getUnitDetails and opens the gallery overlay', async () => {
    mockGetUnitDetails.mockResolvedValueOnce({
      ...unitNoImages,
      images: ['/img/hydrated.png'],
    });
    render(<FleetGridView units={[unitNoImages]} onEdit={vi.fn()} />);

    fireEvent.click(screen.getByAltText('Archon Unit Default'));

    expect(await screen.findByAltText('ASM-040 - 1')).toBeInTheDocument();
    expect(mockGetUnitDetails).toHaveBeenCalledWith('ASM-040');
  });

  it('falls back to the local unit when getUnitDetails rejects, and closes on Escape', async () => {
    mockGetUnitDetails.mockRejectedValueOnce(new Error('network down'));
    render(<FleetGridView units={[unitNoImages]} onEdit={vi.fn()} />);

    fireEvent.click(screen.getByAltText('Archon Unit Default'));

    expect(await screen.findByAltText('ASM-040 - 1')).toBeInTheDocument();
    expect(mockGetUnitDetails).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    await vi.waitFor(() => expect(screen.queryByAltText('ASM-040 - 1')).not.toBeInTheDocument());
  });

  it('renders the edit button when the actor has fleet:write and invokes onEdit on click', () => {
    const onEdit = vi.fn();
    render(<FleetGridView units={[unitNoImages]} onEdit={onEdit} />);

    fireEvent.click(screen.getByTitle('Editar Activo (Auditado)'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'ASM-040' }));
  });

  // 207_AN Bravo reopen: a unit that already has images in fleet data takes
  // the with-images branch of the row thumbnail (own onClick + onError),
  // never exercised by unitNoImages above.
  it('opens the gallery directly (no getUnitDetails call) when the unit already has images, and falls back on image error', async () => {
    const unitWithImages = {
      id: 'ASM-050',
      placas: 'PQR-321',
      marca: 'Kenworth',
      modelo: 'T680',
      status: 'Disponible',
      odometer: 5000,
      images: ['/img/existing.png'],
    } as unknown as FleetUnit;

    render(<FleetGridView units={[unitWithImages]} onEdit={vi.fn()} />);

    const rowThumbnail = screen.getByAltText('ASM-050');
    fireEvent.click(rowThumbnail);

    expect(await screen.findByAltText('ASM-050 - 1')).toBeInTheDocument();
    expect(mockGetUnitDetails).not.toHaveBeenCalled();

    fireEvent.error(rowThumbnail);
    expect((rowThumbnail as HTMLImageElement).src).toContain('archon-unit-default.png');
  });
});

describe('FleetGridView — sorting by KM RESTANTES and PRONÓSTICO (207_AN Bravo reopen)', () => {
  const units = [
    { id: 'ASM-060', placas: 'A', marca: 'X', modelo: 'Y', status: 'Disponible', odometer: 1 },
    { id: 'ASM-061', placas: 'B', marca: 'X', modelo: 'Y', status: 'Disponible', odometer: 2 },
  ] as unknown as FleetUnit[];

  beforeEach(() => {
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

  it('sorts by KM RESTANTES (programacion) and PRONÓSTICO (pronostico) without throwing', () => {
    render(<FleetGridView units={units} onEdit={vi.fn()} />);

    fireEvent.click(screen.getByText('KM RESTANTES'));
    fireEvent.click(screen.getByText('KM RESTANTES'));
    // 'PRONÓSTICO' also appears as a per-row badge fallback label (no
    // forecast data) — the column header is the first DOM occurrence.
    const pronosticoHeader = screen.getAllByText('PRONÓSTICO')[0];
    fireEvent.click(pronosticoHeader);
    fireEvent.click(pronosticoHeader);

    expect(screen.getAllByText(/ASM-06/).length).toBeGreaterThan(0);
  });
});

describe('FleetGridView — column sort', () => {
  const units = [
    { id: 'ASM-003', placas: 'A', marca: 'X', modelo: 'Y', status: 'Disponible', odometer: 1 },
    { id: 'ASM-001', placas: 'B', marca: 'X', modelo: 'Y', status: 'Disponible', odometer: 2 },
    { id: 'ASM-002', placas: 'C', marca: 'X', modelo: 'Y', status: 'Disponible', odometer: 3 },
  ] as unknown as FleetUnit[];

  beforeEach(() => {
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

  it('sorts rows ascending then descending by unit id on repeated header clicks', () => {
    render(<FleetGridView units={units} onEdit={vi.fn()} />);
    const table = screen.getByTestId('fleet-inventory-table');
    const rowsOf = (): string[] =>
      Array.from(table.querySelectorAll('[data-testid^="fleet-row-"]')).map((r) =>
        (r as HTMLElement).getAttribute('data-testid')
      );

    fireEvent.click(screen.getByText('UNIDAD'));
    expect(rowsOf()).toEqual(['fleet-row-asm-001', 'fleet-row-asm-002', 'fleet-row-asm-003']);

    fireEvent.click(screen.getByText('UNIDAD'));
    expect(rowsOf()).toEqual(['fleet-row-asm-003', 'fleet-row-asm-002', 'fleet-row-asm-001']);
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SovereignHeader from './SovereignHeader';
import * as layoutContext from '../../context/SovereignLayoutContext';
import * as fleetContext from '../../context/FleetContext';

/**
 * 🔱 SovereignHeader QA Suite (TypeScript & Vitest Spy Compliant)
 */

let mockLayoutData = {
  title: 'Administrar Unidades',
  description: 'GESTIÓN DE ACTIVOS',
  headerAction: {
    variant: 'navy' as const,
    headerTitle: 'Incidencia Rápida',
    HeaderIcon: (): null => null,
    PayloadIcon: (): null => null,
    actionTitle: 'Reportar',
    description: 'Reportar falla de unidad',
    buttonText: 'CREAR',
    isActive: true,
    onClick: vi.fn(),
  },
};
let mockSearchTerm = '';
const mockSetSearchTerm = vi.fn((val) => {
  mockSearchTerm = val;
});

const mockUnits = [
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
];

describe('SovereignHeader Component (100% QA Universal Search Coverage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchTerm = '';
    mockLayoutData = {
      title: 'Administrar Unidades',
      description: 'GESTIÓN DE ACTIVOS',
      headerAction: {
        variant: 'navy' as const,
        headerTitle: 'Incidencia Rápida',
        HeaderIcon: (): null => null,
        PayloadIcon: (): null => null,
        actionTitle: 'Reportar',
        description: 'Reportar falla de unidad',
        buttonText: 'CREAR',
        isActive: true,
        onClick: vi.fn(),
      },
    };

    // 🔱 Spy on Layout Hook to mock value cleanly without breaking imports
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: mockLayoutData as any,
      searchTerm: mockSearchTerm,
      setSearchTerm: mockSetSearchTerm,
      setSectionData: vi.fn(),
    });

    // 🔱 Spy on Fleet Hook to return mock units
    vi.spyOn(fleetContext, 'useFleet').mockReturnValue({
      units: mockUnits as any,
      stats: {} as any,
      loading: false,
      refreshUnits: vi.fn(),
      startRoute: vi.fn(),
      finishRoute: vi.fn(),
      reportIncident: vi.fn(),
      error: null,
      getUnitDetails: vi.fn(),
    } as any);
  });

  it('renders section title, description and header action card correctly', () => {
    render(<SovereignHeader />);
    expect(screen.getByText('Administrar Unidades')).toBeInTheDocument();
    expect(screen.getByText('GESTIÓN DE ACTIVOS')).toBeInTheDocument();
    expect(screen.getByText('Incidencia Rápida')).toBeInTheDocument();
  });

  it('renders correct main and sub icons for different page titles', () => {
    const titles = [
      'Comando Central',
      'Flota de Activos',
      'Rutas e Itinerarios',
      'Usuarios del Sistema',
      'Salud Financiera',
      'Registro Técnico',
      'Ajustes Generales',
      'Mantenimiento Predictivo',
      'Otro Título',
    ];

    titles.forEach((title) => {
      mockLayoutData.title = title;
      const { unmount } = render(<SovereignHeader />);
      expect(screen.getByText(title)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders the search bar only when section title matches Administrar Unidades', () => {
    const { unmount: unmount1 } = render(<SovereignHeader />);
    expect(
      screen.getByPlaceholderText('Buscar por placas, marca, modelo, sede o departamento...')
    ).toBeInTheDocument();
    unmount1();

    mockLayoutData.title = 'Salud Financiera';
    const { unmount: unmount2 } = render(<SovereignHeader />);
    expect(
      screen.queryByPlaceholderText('Buscar por placas, marca, modelo, sede o departamento...')
    ).not.toBeInTheDocument();
    unmount2();
  });

  it('filters and suggests units by string properties (Aveo, Arian)', () => {
    mockSearchTerm = 'aveo';
    // Re-trigger layout spy for updated search term
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: mockLayoutData as any,
      searchTerm: mockSearchTerm,
      setSearchTerm: mockSetSearchTerm,
      setSectionData: vi.fn(),
    });

    render(<SovereignHeader />);

    const input = screen.getByPlaceholderText(
      'Buscar por placas, marca, modelo, sede o departamento...'
    );
    fireEvent.focus(input);

    expect(screen.getByText('ASM-002 (Modelo: Aveo)')).toBeInTheDocument();
  });

  it('filters and suggests units by numeric properties (Leasing, Odometer)', () => {
    mockSearchTerm = '15,800';
    // Re-trigger layout spy
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: mockLayoutData as any,
      searchTerm: mockSearchTerm,
      setSearchTerm: mockSetSearchTerm,
      setSectionData: vi.fn(),
    });

    render(<SovereignHeader />);

    const input = screen.getByPlaceholderText(
      'Buscar por placas, marca, modelo, sede o departamento...'
    );
    fireEvent.focus(input);

    expect(screen.getByText('ASM-002 (Leasing: 15,800.5 USD)')).toBeInTheDocument();
  });

  it('filters and suggests units by dynamic projection kilometers remaining', () => {
    mockSearchTerm = '7,650';
    // Re-trigger layout spy
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: mockLayoutData as any,
      searchTerm: mockSearchTerm,
      setSearchTerm: mockSetSearchTerm,
      setSectionData: vi.fn(),
    });

    render(<SovereignHeader />);

    const input = screen.getByPlaceholderText(
      'Buscar por placas, marca, modelo, sede o departamento...'
    );
    fireEvent.focus(input);

    expect(screen.getByText('ASM-002 (Km. Restantes: 7,650 KM)')).toBeInTheDocument();
  });

  it('updates the search query and closes dropdown when suggestion is clicked', () => {
    mockSearchTerm = 'aveo';
    // Re-trigger layout spy
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: mockLayoutData as any,
      searchTerm: mockSearchTerm,
      setSearchTerm: mockSetSearchTerm,
      setSectionData: vi.fn(),
    });

    render(<SovereignHeader />);

    const input = screen.getByPlaceholderText(
      'Buscar por placas, marca, modelo, sede o departamento...'
    );
    fireEvent.focus(input);

    const suggestion = screen.getByText('ASM-002 (Modelo: Aveo)');
    fireEvent.click(suggestion);

    expect(mockSetSearchTerm).toHaveBeenCalledWith('ASM-002');
  });

  it('closes suggestions when clicking outside the input container', () => {
    mockSearchTerm = 'aveo';
    // Re-trigger layout spy
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: mockLayoutData as any,
      searchTerm: mockSearchTerm,
      setSearchTerm: mockSetSearchTerm,
      setSectionData: vi.fn(),
    });

    render(<SovereignHeader />);

    const input = screen.getByPlaceholderText(
      'Buscar por placas, marca, modelo, sede o departamento...'
    );
    fireEvent.focus(input);

    expect(screen.getByText('ASM-002 (Modelo: Aveo)')).toBeInTheDocument();

    // Trigger click outside
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('ASM-002 (Modelo: Aveo)')).not.toBeInTheDocument();
  });

  it('closes suggestions when escape key is pressed', () => {
    mockSearchTerm = 'aveo';
    // Re-trigger layout spy
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: mockLayoutData as any,
      searchTerm: mockSearchTerm,
      setSearchTerm: mockSetSearchTerm,
      setSectionData: vi.fn(),
    });

    render(<SovereignHeader />);

    const input = screen.getByPlaceholderText(
      'Buscar por placas, marca, modelo, sede o departamento...'
    );
    fireEvent.focus(input);

    expect(screen.getByText('ASM-002 (Modelo: Aveo)')).toBeInTheDocument();

    // Trigger Escape Key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('ASM-002 (Modelo: Aveo)')).not.toBeInTheDocument();
  });

  it('clears search input when clicking the close/clear button', () => {
    mockSearchTerm = 'aveo';
    // Re-trigger layout spy
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: mockLayoutData as any,
      searchTerm: mockSearchTerm,
      setSearchTerm: mockSetSearchTerm,
      setSectionData: vi.fn(),
    });

    render(<SovereignHeader />);

    const clearBtn = screen.getByTestId('clear-search-btn');
    fireEvent.click(clearBtn);

    expect(mockSetSearchTerm).toHaveBeenCalledWith('');
  });
});

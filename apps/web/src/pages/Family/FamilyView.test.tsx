/* eslint-disable */
// @ts-nocheck
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import FamilyView from './FamilyView';
import api from '../../api/client';

/**
 * FC-10 VIM_SubUniverse_FamiliarScope FaseA — FamilyView
 *
 * AT-FC10-A-WEB-1: renderiza family-view y family-map
 * AT-FC10-A-WEB-2: muestra family-unit-{id} por cada unidad retornada
 * AT-FC10-A-WEB-3: muestra family-empty cuando lista vacía
 * AT-FC10-A-WEB-4: muestra family-error cuando la API falla
 */

vi.mock('../../api/client');
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <div data-testid="mock-map-container">{children}</div>
  ),
  TileLayer: (): React.JSX.Element => <div data-testid="mock-tile-layer" />,
  Marker: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <div data-testid="mock-marker">{children}</div>
  ),
  Popup: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <div data-testid="mock-popup">{children}</div>
  ),
}));
vi.mock('leaflet', () => ({
  default: {
    Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
    divIcon: vi.fn(() => ({})),
  },
}));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

const mockGet = vi.mocked(api.get);

const MOCK_UNITS = [
  {
    unitId: 'FAM-001',
    label: 'Sedán Familiar',
    driverUsername: 'carlos',
    latitude: 25.67,
    longitude: -100.31,
    speed: 60,
    heading: 90,
    lastPing: '2026-06-24T10:00:00Z',
  },
  {
    unitId: 'FAM-002',
    label: 'SUV Familiar',
    driverUsername: null,
    latitude: null,
    longitude: null,
    speed: null,
    heading: null,
    lastPing: null,
  },
];

describe('FC-10 VIM_SubUniverse_FamiliarScope FaseA — FamilyView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('AT-FC10-A-WEB-1: renderiza family-view y family-map', async () => {
    mockGet.mockResolvedValueOnce({ data: { units: [] } });
    render(<FamilyView />);
    expect(screen.getByTestId('family-view')).toBeInTheDocument();
    expect(screen.getByTestId('family-map')).toBeInTheDocument();
  });

  it('AT-FC10-A-WEB-2: muestra family-unit-{id} por cada unidad retornada', async () => {
    mockGet.mockResolvedValueOnce({ data: { units: MOCK_UNITS } });
    render(<FamilyView />);
    await waitFor(() => {
      expect(screen.getByTestId('family-unit-FAM-001')).toBeInTheDocument();
      expect(screen.getByTestId('family-unit-FAM-002')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Sedán Familiar').length).toBeGreaterThan(0);
  });

  it('AT-FC10-A-WEB-3: muestra family-empty cuando lista vacía', async () => {
    mockGet.mockResolvedValueOnce({ data: { units: [] } });
    render(<FamilyView />);
    await waitFor(() => {
      expect(screen.getByTestId('family-empty')).toBeInTheDocument();
    });
  });

  it('AT-FC10-A-WEB-4: muestra family-error cuando la API falla', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    render(<FamilyView />);
    await waitFor(() => {
      expect(screen.getByTestId('family-error')).toBeInTheDocument();
    });
  });
});

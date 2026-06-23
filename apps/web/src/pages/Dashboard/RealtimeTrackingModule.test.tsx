import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import RealtimeTrackingModule from './RealtimeTrackingModule';
import * as telemetryHook from '../../hooks/useRealtimeTelemetry';
import type { TelemetryUnit } from '../../hooks/useRealtimeTelemetry';

// react-leaflet and leaflet require browser DOM APIs not available in jsdom
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
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
    divIcon: vi.fn(() => ({})),
  },
}));

vi.mock('leaflet/dist/leaflet.css', () => ({}));

const MOCK_UNITS: TelemetryUnit[] = [
  {
    unitId: 'PIIC-101',
    latitude: 25.6866,
    longitude: -100.3161,
    speed: 60,
    heading: 90,
    updatedAt: '2026-06-23 03:00:00',
  },
  {
    unitId: 'PIIC-102',
    latitude: 20.9674,
    longitude: -89.6237,
    speed: 0,
    heading: 0,
    updatedAt: '2026-06-23 03:01:00',
  },
];

describe('FC-3 Realtime_Telemetry FaseC — RealtimeTrackingModule', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('AT-RT-C-1: renders module title and map container', () => {
    vi.spyOn(telemetryHook, 'useRealtimeTelemetry').mockReturnValue({
      units: [],
      isLoading: false,
      error: null,
      lastRefresh: null,
    });

    render(<RealtimeTrackingModule />);

    expect(screen.getByTestId('realtime-tracking-module')).toBeInTheDocument();
    expect(screen.getByText('Rastreo en Tiempo Real')).toBeInTheDocument();
    expect(screen.getByTestId('mock-map-container')).toBeInTheDocument();
  });

  it('AT-RT-C-2: shows loading spinner while fetching', () => {
    vi.spyOn(telemetryHook, 'useRealtimeTelemetry').mockReturnValue({
      units: [],
      isLoading: true,
      error: null,
      lastRefresh: null,
    });

    render(<RealtimeTrackingModule />);
    expect(screen.getByText(/actualizando/i)).toBeInTheDocument();
  });

  it('AT-RT-C-3: renders one Marker per unit', async () => {
    vi.spyOn(telemetryHook, 'useRealtimeTelemetry').mockReturnValue({
      units: MOCK_UNITS,
      isLoading: false,
      error: null,
      lastRefresh: new Date('2026-06-23T03:00:00'),
    });

    render(<RealtimeTrackingModule />);
    const markers = await screen.findAllByTestId('mock-marker');
    expect(markers).toHaveLength(MOCK_UNITS.length);
  });

  it('AT-RT-C-4: displays unit count badge', () => {
    vi.spyOn(telemetryHook, 'useRealtimeTelemetry').mockReturnValue({
      units: MOCK_UNITS,
      isLoading: false,
      error: null,
      lastRefresh: new Date(),
    });

    render(<RealtimeTrackingModule />);
    expect(screen.getByText(/2 unidades/i)).toBeInTheDocument();
  });

  it('AT-RT-C-5: shows error banner when fetch fails', () => {
    vi.spyOn(telemetryHook, 'useRealtimeTelemetry').mockReturnValue({
      units: [],
      isLoading: false,
      error: 'Error al obtener posiciones en tiempo real',
      lastRefresh: null,
    });

    render(<RealtimeTrackingModule />);
    expect(screen.getByText(/error al obtener posiciones/i)).toBeInTheDocument();
  });

  it('AT-RT-C-6: shows empty state when no units and not loading', () => {
    vi.spyOn(telemetryHook, 'useRealtimeTelemetry').mockReturnValue({
      units: [],
      isLoading: false,
      error: null,
      lastRefresh: null,
    });

    render(<RealtimeTrackingModule />);
    expect(screen.getByText(/sin unidades con posici/i)).toBeInTheDocument();
  });

  it('AT-RT-C-7: popup shows unit ID, speed, heading for each marker', async () => {
    vi.spyOn(telemetryHook, 'useRealtimeTelemetry').mockReturnValue({
      units: [MOCK_UNITS[0]],
      isLoading: false,
      error: null,
      lastRefresh: new Date(),
    });

    render(<RealtimeTrackingModule />);

    await waitFor(() => {
      expect(screen.getByText('PIIC-101')).toBeInTheDocument();
      expect(screen.getByText(/velocidad.*60/i)).toBeInTheDocument();
      expect(screen.getByText(/rumbo.*90/i)).toBeInTheDocument();
    });
  });
});

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { useRealtimeTelemetry } from '../../hooks/useRealtimeTelemetry';
import AT from '../../styles/archonTypography';

// ─── Leaflet default icon fix (Vite asset resolution) ────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl; // eslint-disable-line no-underscore-dangle
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── CartoDB tile URLs ────────────────────────────────────────────────────────
const TILES_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILES_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// ─── Rotating SVG truck marker ────────────────────────────────────────────────
function createTruckIcon(heading: number, speed: number): L.DivIcon {
  const isMoving = speed > 2;
  const color = isMoving ? '#f2b705' : '#94a3b8';
  return L.divIcon({
    className: '',
    html: `<div style="transform:rotate(${heading}deg);transition:transform 1s ease-in-out;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="13" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="1.5"/>
        <polygon points="14,5 20,22 14,18 8,22" fill="${color}"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

// ─── Default map center (Mexico) ──────────────────────────────────────────────
const DEFAULT_CENTER: [number, number] = [23.6345, -102.5528];
const DEFAULT_ZOOM = 5;

// ─── Component ────────────────────────────────────────────────────────────────
const RealtimeTrackingModule: React.FC = () => {
  const { units, isLoading, error, lastRefresh } = useRealtimeTelemetry();

  const markers = useMemo(
    () =>
      units.map((u) => ({
        ...u,
        icon: createTruckIcon(u.heading, u.speed),
      })),
    [units]
  );

  return (
    <div className="flex flex-col h-full gap-4 pt-4" data-testid="realtime-tracking-module">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-[#f2b705]" />
          <h1 className={AT.pageTitle}>Rastreo en Tiempo Real</h1>
        </div>
        <div className="flex items-center gap-3 text-archon-xs text-[#0f2a44]/50">
          {isLoading && (
            <span className="flex items-center gap-1">
              <RefreshCw size={12} className="animate-spin" />
              Actualizando…
            </span>
          )}
          {lastRefresh && !isLoading && (
            <span>
              Última actualización:{' '}
              {lastRefresh.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}
          <span className="font-bold text-[#0f2a44]/40">
            {units.length} unidad{units.length !== 1 ? 'es' : ''}
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Map */}
      <div
        className="flex-1 rounded-xl overflow-hidden border border-white/10 shadow-lg min-h-[420px]"
        data-testid="map-container-wrapper"
      >
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          style={{ minHeight: '420px' }}
        >
          <TileLayer
            url={TILES_DARK}
            attribution={TILES_ATTRIBUTION}
            subdomains="abcd"
            maxZoom={19}
          />
          {markers.map((m) => (
            <Marker key={m.unitId} position={[m.latitude, m.longitude]} icon={m.icon}>
              <Popup>
                <div className="text-xs font-bold text-[#0f2a44]">
                  <p className="text-sm font-black mb-1">{m.unitId}</p>
                  <p>Velocidad: {m.speed.toFixed(1)} km/h</p>
                  <p>Rumbo: {m.heading.toFixed(0)}°</p>
                  <p className="text-[#0f2a44]/50 mt-1">
                    {new Date(m.updatedAt).toLocaleTimeString('es-MX')}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Empty state */}
      {!isLoading && !error && units.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#0f2a44]/40">
          <MapPin size={32} />
          <p className="text-sm font-medium">Sin unidades con posición activa</p>
          <p className="text-xs">Las unidades aparecerán aquí cuando envíen su ubicación GPS</p>
        </div>
      )}

      {/* Tile attribution note */}
      <p className="text-[10px] text-[#0f2a44]/30 text-right">
        Tiles: CartoDB Dark Matter · Polled every 10s
      </p>
    </div>
  );
};

export default RealtimeTrackingModule;

import React, { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { useRealtimeTelemetry, type TelemetryUnit } from '../../hooks/useRealtimeTelemetry';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import SovereignTileLayer from './SovereignTileLayer';

// ─── Leaflet default icon fix (Vite asset resolution) ────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl; // eslint-disable-line no-underscore-dangle
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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

/** Estado de la consulta: actualizando, última actualización y número de unidades. */
const TrackingStatus: React.FC<{ isLoading: boolean; lastRefresh: Date | null; count: number }> = ({
  isLoading,
  lastRefresh,
  count,
}) => (
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
      {count} unidad{count === 1 ? '' : 'es'}
    </span>
  </div>
);

/** Un marcador por unidad con su ficha de velocidad y rumbo. */
const UnitMarkers: React.FC<{ units: TelemetryUnit[] }> = ({ units }) => {
  const markers = useMemo(
    () => units.map((u) => ({ ...u, icon: createTruckIcon(u.heading, u.speed) })),
    [units]
  );
  return (
    <>
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
    </>
  );
};

/** Mapa con la capa soberana de mosaicos (FC207 F1) y los marcadores. */
const TrackingMap: React.FC<{ units: TelemetryUnit[] }> = ({ units }) => (
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
      <SovereignTileLayer />
      <UnitMarkers units={units} />
    </MapContainer>
  </div>
);

/** Aviso cuando ninguna unidad ha reportado posición. */
const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#0f2a44]/40">
    <MapPin size={32} />
    <p className="text-sm font-medium">Sin unidades con posición activa</p>
    <p className="text-xs">Las unidades aparecerán aquí cuando envíen su ubicación GPS</p>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
/** Rastreo en tiempo real: estado de la consulta, mapa soberano y marcadores por unidad. */
const RealtimeTrackingModule: React.FC = () => {
  const { units, isLoading, error, lastRefresh } = useRealtimeTelemetry();
  const { setSectionData } = useSovereignLayout();
  useEffect(() => {
    setSectionData('Rastreo en Tiempo Real', 'Telemetría GPS en Vivo'); // FC207 F1 (F-OBS1)
  }, [setSectionData]);

  return (
    <div className="flex flex-col h-full gap-4 pt-4" data-testid="realtime-tracking-module">
      <div className="flex items-center justify-end flex-wrap gap-2">
        <TrackingStatus isLoading={isLoading} lastRefresh={lastRefresh} count={units.length} />
      </div>
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      <TrackingMap units={units} />
      {!isLoading && !error && units.length === 0 && <EmptyState />}
      <p className="text-[10px] text-[#0f2a44]/30 text-right">
        Mapa vía gateway Archon · Actualización cada 10 s
      </p>
    </div>
  );
};

export default RealtimeTrackingModule;

import React, { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Users, MapPin, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import 'leaflet/dist/leaflet.css';

interface FamilyUnit {
  unitId: string;
  label: string;
  driverUsername: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  heading: number | null;
  lastPing: string | null;
}

const DEFAULT_CENTER: [number, number] = [25.686614, -100.316113];

const FamilyView: React.FC = () => {
  const { setSectionData } = useSovereignLayout();
  const [units, setUnits] = useState<FamilyUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnits = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ units: FamilyUnit[] }>('/telemetry/family-units');
      setUnits(res.data.units);
    } catch {
      setError('Error al cargar unidades familiares');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setSectionData('Mi Familia', 'Subuniverso Familiar — Rastreo en tiempo real');
    fetchUnits().catch(() => undefined);
  }, [setSectionData, fetchUnits]);

  const unitsWithPosition = units.filter((u) => u.latitude !== null && u.longitude !== null);
  const mapCenter: [number, number] =
    unitsWithPosition.length > 0
      ? [unitsWithPosition[0].latitude!, unitsWithPosition[0].longitude!]
      : DEFAULT_CENTER;

  return (
    <div data-testid="family-view" className="flex flex-col gap-4 max-w-2xl mx-auto py-6">
      {/* Map */}
      <div
        data-testid="family-map"
        className="h-64 rounded-xl overflow-hidden border border-[#0f2a44]/10"
      >
        {!isLoading && !error && (
          <MapContainer center={mapCenter} zoom={13} className="w-full h-full">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            {unitsWithPosition.map((unit) => (
              <Marker key={unit.unitId} position={[unit.latitude!, unit.longitude!]}>
                <Popup>
                  <span className="font-bold">{unit.label}</span>
                  {unit.driverUsername && <span> · {unit.driverUsername}</span>}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div data-testid="family-loading" className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-archon-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          data-testid="family-error"
          className="flex items-center gap-2 text-red-400 text-archon-sm"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Units list */}
      {!isLoading && !error && (
        <div className="flex flex-col gap-2">
          {units.length === 0 && (
            <p
              data-testid="family-empty"
              className="text-archon-xs text-slate-400 uppercase tracking-widest text-center py-8"
            >
              Sin unidades familiares registradas
            </p>
          )}
          {units.map((unit) => (
            <div
              key={unit.unitId}
              data-testid={`family-unit-${unit.unitId}`}
              className="flex items-center justify-between gap-3 p-3 bg-white border border-[#0f2a44]/10 rounded-xl hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0f2a44]/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#0f2a44]/60" />
                </div>
                <div className="flex flex-col">
                  <span className="text-archon-sm font-black text-[#0f2a44] uppercase tracking-tight">
                    {unit.label}
                  </span>
                  {unit.driverUsername && (
                    <span className="text-archon-xs text-slate-400 uppercase tracking-widest">
                      @{unit.driverUsername}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                {unit.latitude !== null ? (
                  <>
                    <div className="flex items-center gap-1 text-emerald-500">
                      <MapPin className="w-3 h-3" />
                      <span className="text-archon-xs font-black uppercase tracking-widest">
                        En línea
                      </span>
                    </div>
                    {unit.speed !== null && (
                      <span className="text-archon-xs text-slate-400 uppercase tracking-widest">
                        {unit.speed} km/h
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-archon-xs text-slate-400 uppercase tracking-widest">
                    Sin señal
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FamilyView;

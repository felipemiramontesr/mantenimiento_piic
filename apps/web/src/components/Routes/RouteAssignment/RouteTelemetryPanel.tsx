import React from 'react';
import { Gauge, Droplets, AlertCircle } from 'lucide-react';
import ArchonFuelSensor from '../ArchonFuelSensor';
import FuelVolumeChart from '../FuelVolumeChart';
import { RouteAssignmentPanelProps } from './types';

interface RouteTelemetryPanelProps extends RouteAssignmentPanelProps {
  tankCapacity: number;
  startReadingDisplay: string;
}

/**
 * 🔱 Archon Panel: Route Telemetry (Fase III)
 * Real-time sensor synchronization for odometry and fuel levels.
 */
const RouteTelemetryPanel: React.FC<RouteTelemetryPanelProps> = ({
  formData,
  updateForm,
  isFinished,
  tankCapacity,
  startReadingDisplay,
}) => {
  if (!formData.unitId) {
    return (
      <div className="space-y-4 opacity-50">
        <div className="flex items-center gap-2 h-4">
          <Gauge size={14} className="text-[#0f2a44]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44]">
            Fase III: Telemetría de Salida
          </span>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
            PARAMETRÍA DE SENSORES
          </label>
          <div className="bg-[#0f2a44]/5 p-8 rounded-[4px] border-2 border-dashed border-[#0f2a44]/10 flex flex-col items-center justify-center text-center">
            <AlertCircle size={24} className="text-[#0f2a44]/20 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]/40">
              SISTEMA DESCONECTADO
            </p>
            <p className="text-[8px] font-bold text-[#0f2a44]/30 mt-1">
              SELECCIONE UNA UNIDAD PARA ACTIVAR PARAMETRÍA
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getFuelColor = (level: number): string => {
    if (level >= 87.5) return '#22c55e';
    if (level >= 62.5) return '#facc15';
    if (level >= 37.5) return '#f97316';
    if (level >= 12.5) return '#ef4444';
    return '#a855f7';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="bg-sky-600 p-2 rounded-[4px]">
          <Gauge size={20} className="text-white" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 opacity-50">
            Fase III
          </span>
          <h3 className="text-[14px] font-black uppercase tracking-tight text-[#0f2a44]">
            Telemetría de Salida
          </h3>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
          PARAMETRÍA DE SENSORES
        </label>
        <div className="bg-[#0f2a44]/5 p-3 rounded-[4px] space-y-4">
          {/* Odometry Snapshot */}
          <div className="flex items-center justify-between border-b border-[#0f2a44]/10 pb-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[#0f2a44] mb-0.5">
                Lectura de Odómetro
              </span>
              <div className="flex items-center gap-2">
                <Gauge size={18} className="text-[#0f2a44]/40" />
                <p className="text-2xl font-black text-[#0f2a44] tracking-tighter">
                  {startReadingDisplay}{' '}
                  <span className="text-[10px] opacity-40 font-bold ml-1">KM</span>
                </p>
              </div>
            </div>
          </div>

          {/* Fuel Sensor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets size={14} className="text-emerald-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]">
                  Nivel de Combustible:
                </p>
              </div>
              <p className="text-xl font-black text-[#0f2a44] tracking-tighter">
                {formData.fuelLevel}%
              </p>
            </div>

            <div>
              <ArchonFuelSensor
                value={formData.fuelLevel}
                onChange={(val: number): void => updateForm({ fuelLevel: val })}
                disabled={isFinished}
              />
            </div>

            {tankCapacity > 0 && (
              <div>
                <FuelVolumeChart
                  currentLevel={formData.fuelLevel}
                  totalCapacity={tankCapacity}
                  color={getFuelColor(formData.fuelLevel)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RouteTelemetryPanel);

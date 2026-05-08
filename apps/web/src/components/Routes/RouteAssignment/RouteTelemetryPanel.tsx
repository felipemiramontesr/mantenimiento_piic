import React from 'react';
import { Milestone, Gauge, Fuel, Info } from 'lucide-react';
import ArchonFuelSensor from '../ArchonFuelSensor';
import ArchonField from '../../ArchonField';

interface RouteTelemetryPanelProps {
  phase: 'departure' | 'return';
  odometerValue: string;
  fuelLevelValue: number;
  onOdometerChange: (val: string) => void;
  onFuelLevelChange: (val: number) => void;
  startReading?: number;
  unit?: string;
  disabled?: boolean;
}

/**
 * 🔱 Archon Panel: Route Telemetry (v.75.0.0)
 * Precision cockpit interface for vehicle sensors.
 */
const RouteTelemetryPanel: React.FC<RouteTelemetryPanelProps> = ({
  phase,
  odometerValue,
  fuelLevelValue,
  onOdometerChange,
  onFuelLevelChange,
  startReading,
  unit = 'km',
  disabled = false,
}) => {
  const isReturn = phase === 'return';

  return (
    <div className="bg-white rounded-lg border border-[#0f2a44]/10 shadow-sm overflow-hidden mb-4">
      {/* HEADER */}
      <div className="bg-[#0f2a44]/5 px-4 py-2 border-b border-[#0f2a44]/10 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#0f2a44] flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5" />
          Telemetría de {isReturn ? 'Retorno' : 'Salida'}
        </h3>
        {isReturn && startReading !== undefined && (
          <div className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
            Salida: {startReading} {unit}
          </div>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Odómetro / Horómetro Section */}
        <div className="space-y-2">
          <ArchonField
            label={`LECTURA DE ODÓMETRO (${unit.toUpperCase()})`}
            icon={Milestone}
            required
          >
            <div className="relative">
              <input
                type="number"
                value={odometerValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  onOdometerChange(e.target.value)
                }
                placeholder="0.00"
                disabled={disabled}
                className="w-full bg-[#0f2a44]/5 border-b-2 border-[#0f2a44]/10 focus:border-[#0f2a44] p-3 pl-10 text-lg font-mono text-[#0f2a44] outline-none transition-all rounded-t-md"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30 font-bold">
                #
              </span>
            </div>
          </ArchonField>
          <p className="text-[10px] text-[#0f2a44]/50 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Ingrese la lectura actual del tablero físico
          </p>
        </div>

        {/* Fuel Level Section with Archon Sensor */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]/70 flex items-center gap-1.5">
              <Fuel className="w-3 h-3" />
              Nivel de Combustible
            </label>
            <span className="font-mono text-xs bg-[#0f2a44] text-white px-2 py-0.5 rounded font-bold">
              {fuelLevelValue}%
            </span>
          </div>

          <div className="px-2">
            <ArchonFuelSensor
              value={fuelLevelValue}
              onChange={onFuelLevelChange}
              disabled={disabled}
            />
          </div>

          <div className="bg-[#0f2a44]/5 p-2.5 rounded-lg border border-[#0f2a44]/10">
            <p className="text-[10px] text-[#0f2a44]/70 leading-relaxed italic text-center">
              Seleccione la posición que mejor represente el indicador del tablero.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RouteTelemetryPanel);

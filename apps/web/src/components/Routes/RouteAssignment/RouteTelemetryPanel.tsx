import React from 'react';
import { Milestone, Gauge, Fuel, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import ArchonFuelSensor from '../ArchonFuelSensor';

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
    <Card className="border-[#0f2a44]/10 shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden">
      <div className="bg-[#0f2a44]/5 px-4 py-2 border-b border-[#0f2a44]/10 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#0f2a44] flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5" />
          Telemetría de {isReturn ? 'Retorno' : 'Salida'}
        </h3>
        {isReturn && startReading !== undefined && (
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
            Salida: {startReading} {unit}
          </Badge>
        )}
      </div>

      <CardContent className="p-4 space-y-6">
        {/* Odómetro / Horómetro Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-[#0f2a44]/70 uppercase flex items-center gap-1.5">
              <Milestone className="w-3 h-3" />
              Lectura de Odómetro ({unit})
            </Label>
          </div>
          <div className="relative">
            <Input
              type="number"
              value={odometerValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                onOdometerChange(e.target.value)
              }
              placeholder="0.00"
              disabled={disabled}
              className="pl-9 bg-white border-[#0f2a44]/15 focus:ring-[#0f2a44]/20 h-11 text-lg font-mono"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30 font-bold">
              #
            </span>
          </div>
          <p className="text-[10px] text-[#0f2a44]/50 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Ingrese la lectura actual del tablero físico
          </p>
        </div>

        {/* Fuel Level Section with Archon Sensor */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-[#0f2a44]/70 uppercase flex items-center gap-1.5">
              <Fuel className="w-3 h-3" />
              Nivel de Combustible
            </Label>
            <Badge variant="secondary" className="font-mono text-xs bg-[#0f2a44] text-white">
              {fuelLevelValue}%
            </Badge>
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
      </CardContent>
    </Card>
  );
};

export default React.memo(RouteTelemetryPanel);

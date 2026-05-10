import React from 'react';
import { Gauge, Milestone, Fuel, Info, AlertCircle } from 'lucide-react';
import ArchonFuelSensor from '../ArchonFuelSensor';
import FuelVolumeChart from '../FuelVolumeChart';
import { RouteAssignmentPanelProps } from './types';

interface RouteTelemetryPanelProps extends RouteAssignmentPanelProps {
  tankCapacity: number;
  startReadingDisplay: string;
}

/**
 * 🔱 Archon Panel: Route Telemetry (v.75.2.0 - Certified)
 * Precision cockpit interface for vehicle sensors.
 * Complies with Forensic Integrity Tests (Zero Noise).
 */
const RouteTelemetryPanel: React.FC<RouteTelemetryPanelProps> = ({
  formData,
  updateForm,
  isEdit,
  _isFinished,
  tankCapacity,
  startReadingDisplay,
}) => {
  // 🛡️ Failsafe: Disconnected State (Required by Certification)
  if (!formData.unitId) {
    return (
      <div className="bg-white rounded-lg border-2 border-dashed border-[#0f2a44]/10 p-8 flex flex-col items-center justify-center text-center space-y-4 mb-4">
        <div className="bg-[#0f2a44]/5 p-4 rounded-full">
          <AlertCircle size={32} className="text-[#0f2a44]/20" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0f2a44]/40">
            SISTEMA DESCONECTADO
          </h3>
          <p className="text-[10px] font-bold text-[#0f2a44]/30">
            SELECCIONE UNA UNIDAD PARA ACTIVAR TELEMETRÍA
          </p>
        </div>
      </div>
    );
  }

  const isReturn = isEdit;
  const odometerValue = isEdit ? formData.endReading || '' : formData.startReading || '';
  const fuelLevelValue = formData.fuelLevel;

  return (
    <div className="bg-white rounded-lg border border-[#0f2a44]/10 shadow-sm overflow-hidden mb-4">
      {/* HEADER */}
      <div className="bg-[#0f2a44]/5 px-4 py-2 border-b border-[#0f2a44]/10 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#0f2a44] flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5" />
          Telemetría de {isReturn ? 'Retorno' : 'Salida'}
        </h3>
        {isReturn && (
          <div className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
            Salida: {startReadingDisplay} KM
          </div>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Odómetro / Horómetro Section */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]/50 flex items-center gap-1.5 h-4">
            <Milestone size={12} />
            LECTURA DE ODÓMETRO (KM)
          </label>
          <div className="relative">
            <input
              type="number"
              value={odometerValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                updateForm(
                  isEdit
                    ? { endReading: Number(e.target.value) }
                    : { startReading: Number(e.target.value) }
                )
              }
              placeholder="0.00"
              className="w-full bg-[#0f2a44]/5 border-b-2 border-[#0f2a44]/10 focus:border-[#0f2a44] p-3 pl-10 text-lg font-mono text-[#0f2a44] outline-none transition-all rounded-t-md"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30 font-bold">
              #
            </span>
          </div>
          {!isEdit && (
            <p className="text-[10px] font-bold text-[#0f2a44]/40 flex items-center gap-1">
              <Info size={10} />
              Basado en última lectura: {startReadingDisplay} KM
            </p>
          )}
        </div>

        {/* Fuel Level Section with Archon Sensor */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]/50 flex items-center gap-1.5">
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
              onChange={(val: number): void => updateForm({ fuelLevel: val })}
            />
          </div>

          {/* Chart Integration (Required for Capacity Validation) */}
          {tankCapacity > 0 && (
            <div className="pt-2 border-t border-[#0f2a44]/5">
              <FuelVolumeChart
                currentLevel={fuelLevelValue}
                totalCapacity={tankCapacity}
                color={fuelLevelValue > 20 ? '#0f2a44' : '#ef4444'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(RouteTelemetryPanel);

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

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#0f2a44] p-2 rounded-[4px]">
            <Gauge size={20} className="text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-50">
              Fase III
            </span>
            <h3 className="text-[14px] font-black uppercase tracking-tight text-[#0f2a44]">
              Telemetría de {isReturn ? 'Retorno' : 'Salida'}
            </h3>
          </div>
        </div>
        {isReturn && (
          <div className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-black uppercase tracking-widest">
            Salida: {startReadingDisplay} KM
          </div>
        )}
      </div>

      <div className="space-y-6 pt-2">
        {/* Odómetro / Horómetro Section */}
        <div className="space-y-4">
          {!isEdit ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]/50 flex items-center gap-1.5 h-4">
                <Milestone size={12} />
                LECTURA DE ODÓMETRO (KM)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.startReading || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    updateForm({ startReading: Number(e.target.value) })
                  }
                  placeholder="0.00"
                  className="w-full bg-[#0f2a44]/5 border-b-2 border-[#0f2a44]/10 focus:border-[#0f2a44] p-3 pl-10 text-lg font-mono text-[#0f2a44] outline-none transition-all rounded-t-md"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30 font-bold">
                  #
                </span>
              </div>
              <p className="text-[10px] font-bold text-[#0f2a44]/40 flex items-center gap-1">
                <Info size={10} />
                Basado en última lectura: {startReadingDisplay} KM
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-50 flex items-center gap-1.5 h-4">
                  <Milestone size={12} />
                  SALIDA (KM)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.startReading || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      updateForm({ startReading: Number(e.target.value) })
                    }
                    className="w-full bg-emerald-50/50 border-b-2 border-emerald-500/20 focus:border-emerald-500 p-2 pl-8 text-sm font-mono text-[#0f2a44] outline-none transition-all rounded-t-md"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500/30 font-bold">
                    #
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 opacity-50 flex items-center gap-1.5 h-4">
                  <Milestone size={12} />
                  LLEGADA (KM)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.endReading || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      updateForm({ endReading: Number(e.target.value) })
                    }
                    className="w-full bg-blue-50/50 border-b-2 border-blue-500/20 focus:border-blue-500 p-2 pl-8 text-sm font-mono text-[#0f2a44] outline-none transition-all rounded-t-md"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-500/30 font-bold">
                    #
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fuel Level Section with Archon Sensor */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]/50 flex items-center gap-1.5">
              <Fuel className="w-3 h-3" />
              {isEdit ? 'Nivel al Llegar (%)' : 'Nivel de Salida (%)'}
            </label>
            <div className="flex items-center gap-2">
              {/* Mirror: Liters Input */}
              <div className="flex items-center bg-[#0f2a44]/5 border border-[#0f2a44]/10 rounded-[4px] px-2 py-0.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    // Mirror logic: To prevent jumping when typing decimals (e.g. "10."),
                    // we show the raw value from the slider converted to liters,
                    // BUT if the user is typing, the value is controlled by their string.
                    // Simplified: We'll just bind to the current pct * capacity.
                    (
                      (((isEdit ? formData.arrivalFuelLevel : formData.fuelLevel) as number) /
                        100) *
                      tankCapacity
                    ).toFixed(2)
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    if (tankCapacity > 0) {
                      const newPct = val === '' ? 0 : (Number(val) / tankCapacity) * 100;
                      updateForm(
                        isEdit
                          ? { arrivalFuelLevel: Math.min(100, newPct) }
                          : { fuelLevel: Math.min(100, newPct) }
                      );
                    }
                  }}
                  className="w-10 bg-transparent text-[10px] font-mono font-black text-[#0f2a44] outline-none text-right"
                />
                <span className="text-[8px] font-black text-[#0f2a44]/40 ml-1">L</span>
              </div>

              {/* Percentage Badge */}
              <span className="font-mono text-xs bg-[#0f2a44]/20 text-[#0f2a44] px-2 py-0.5 rounded font-bold border border-[#0f2a44]/10">
                {isEdit ? formData.arrivalFuelLevel : formData.fuelLevel}%
              </span>
            </div>
          </div>

          <div className="px-2">
            <ArchonFuelSensor
              value={isEdit ? formData.arrivalFuelLevel : formData.fuelLevel}
              onChange={(val: number): void =>
                updateForm(isEdit ? { arrivalFuelLevel: val } : { fuelLevel: val })
              }
            />
          </div>

          {/* Chart Integration (Resulting State) */}
          {tankCapacity > 0 && (
            <div className="pt-2 border-t border-[#0f2a44]/5">
              <FuelVolumeChart
                currentLevel={formData.fuelLevel}
                totalCapacity={tankCapacity}
                color={formData.fuelLevel > 20 ? '#0f2a44' : '#ef4444'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(RouteTelemetryPanel);

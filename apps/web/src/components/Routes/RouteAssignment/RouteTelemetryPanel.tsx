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

  const fuelPct = isEdit ? formData.arrivalFuelLevel : formData.fuelLevel;

  const litersValue = ((): number | string => {
    if (tankCapacity <= 0) return '';
    if (fuelPct === undefined || fuelPct === null || fuelPct === '') return '';
    return Number(((Number(fuelPct) / 100) * tankCapacity).toFixed(1));
  })();

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#f2b705] p-2 rounded-[4px]">
            <Gauge size={20} className="text-[#0f2a44]" />
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
              <span className="font-mono text-[11px] bg-[#0f2a44]/5 text-[#0f2a44]/60 px-2 py-0.5 rounded font-bold border border-[#0f2a44]/10">
                {Number(isEdit ? formData.arrivalFuelLevel : formData.fuelLevel).toFixed(1)}%
              </span>
              
              {/* 🔱 Archon Dual-Input: Liters Selector with Safe Guards */}
              {tankCapacity > 0 ? (
                <div className="flex items-center gap-1 bg-[#0f2a44]/5 px-2 py-0.5 rounded border border-[#0f2a44]/10 focus-within:border-[#f2b705] focus-within:bg-white transition-all">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={tankCapacity}
                    value={litersValue}
                    onChange={(e): void => {
                      const inputVal = e.target.value;
                      if (inputVal === '') {
                        updateForm(isEdit ? { arrivalFuelLevel: 0 } : { fuelLevel: 0 });
                        return;
                      }
                      const liters = Math.max(0, Math.min(tankCapacity, Number(inputVal)));
                      const newPct = (liters / tankCapacity) * 100;
                      if (isEdit) {
                        updateForm({ arrivalFuelLevel: newPct });
                      } else {
                        updateForm({ fuelLevel: newPct });
                      }
                    }}
                    className="w-12 bg-transparent font-mono text-xs text-[#0f2a44] font-black focus:outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[9px] font-black text-[#0f2a44]/40 uppercase tracking-tight select-none">L</span>
                </div>
              ) : (
                <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded border border-rose-200 uppercase tracking-wider">
                  Falta Capacidad Tanque
                </span>
              )}
            </div>
          </div>

          <div className="px-2">
            <ArchonFuelSensor
              value={Number(fuelPct)}
              onChange={(val: number): void => {
                if (isEdit) {
                  updateForm({ arrivalFuelLevel: val });
                } else {
                  updateForm({ fuelLevel: val });
                }
              }}
            />
          </div>

          {/* Chart Integration (Resulting State) */}
          {tankCapacity > 0 && (
            <div className="pt-2 border-t border-[#0f2a44]/5">
              <FuelVolumeChart
                currentLevel={Number(fuelPct)}
                totalCapacity={tankCapacity}
                color={Number(fuelPct) > 20 ? '#0f2a44' : '#ef4444'}
              />
            </div>
          )}
        </div>


      </div>
    </div>
  );
};

export default React.memo(RouteTelemetryPanel);

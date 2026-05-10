import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Droplets } from 'lucide-react';
import ArchonImageUploader from '../../ArchonImageUploader';
import { RouteAssignmentPanelProps } from './types';

/**
 * 🔱 Archon Panel: Route Closure (Fase IV)
 * Handles final evidence capture, fuel tickets and industrial telemetry synchronization.
 */
const RouteClosurePanel: React.FC<RouteAssignmentPanelProps> = ({ formData, updateForm }) => {
  const tireData = React.useMemo(() => {
    try {
      return JSON.parse(formData.tirePressureJson || '{}');
    } catch {
      return {};
    }
  }, [formData.tirePressureJson]);

  const updateTire = (pos: string, val: string): void => {
    const newTires = { ...tireData, [pos]: val };
    updateForm({ tirePressureJson: JSON.stringify(newTires) });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 pt-8 border-t border-[#0f2a44]/5"
    >
      <div className="flex items-center gap-3">
        <div className="bg-amber-500 p-2 rounded-[4px]">
          <Camera size={20} className="text-white" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 opacity-50">
            Fase IV
          </span>
          <h3 className="text-[14px] font-black uppercase tracking-tight text-[#0f2a44]">
            Evidencia y Cierre
          </h3>
        </div>
      </div>

      <div className="bg-amber-50/30 border border-amber-200/50 p-3 rounded-[4px] space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
              Litros de Combustible Cargados
            </label>
            <div className="relative">
              <Droplets
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={Number(formData.fuelLitersLoaded) === 0 ? '' : formData.fuelLitersLoaded}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  updateForm({ fuelLitersLoaded: val === '' ? 0 : Number(val) });
                }}
                className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-amber-500 p-2.5 pl-10 text-xs font-black text-[#0f2a44] placeholder:text-[#0f2a44]/30 outline-none transition-colors rounded-[4px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 flex items-center justify-between">
              Monto Total del Ticket
              <span className="text-amber-600 font-black">$</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/40 font-black text-[10px]">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={Number(formData.fuelAmount) === 0 ? '' : formData.fuelAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  updateForm({ fuelAmount: val === '' ? 0 : Number(val) });
                }}
                className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-amber-500 p-2.5 pl-10 text-xs font-black text-[#0f2a44] placeholder:text-[#0f2a44]/30 outline-none transition-colors rounded-[4px]"
              />
            </div>
            <p className="text-[8px] font-bold text-[#0f2a44]/40 italic">
              * Incluye combustible, aditivos y otros insumos del ticket.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
            Ticket de Combustible (Evidencia)
          </label>
          <ArchonImageUploader
            images={formData.fuelTicketImage ? [formData.fuelTicketImage] : []}
            onChange={(imgs: string[]): void => updateForm({ fuelTicketImage: imgs[0] || '' })}
            title="Capturar Ticket"
            maxImages={1}
          />
        </div>

        {/* Checklist Forense Industrial */}
        <div className="pt-4 border-t border-[#0f2a44]/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="additivesCheck"
                checked={formData.additivesCheck}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  updateForm({ additivesCheck: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="additivesCheck" className="text-xs font-bold text-[#0f2a44]">
                ¿Se aplicaron Aditivos?
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
              Presión de Neumáticos (PSI)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['DI', 'DD', 'TI', 'TD'].map((pos) => (
                <div key={pos} className="space-y-1">
                  <span className="text-[8px] font-black text-[#0f2a44] opacity-40 block text-center">
                    {pos}
                  </span>
                  <input
                    type="text"
                    placeholder="--"
                    value={tireData[pos] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      updateTire(pos, e.target.value)
                    }
                    className="w-full bg-white border border-[#0f2a44]/10 p-1.5 text-center text-[10px] font-black text-[#0f2a44] rounded-[4px] focus:border-amber-500 outline-none transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(RouteClosurePanel);

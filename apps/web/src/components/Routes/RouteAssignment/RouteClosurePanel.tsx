import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Gauge, Droplets } from 'lucide-react';
import ArchonImageUploader from '../../ArchonImageUploader';
import { RouteAssignmentPanelProps } from './types';

/**
 * 🔱 Archon Panel: Route Closure (Fase IV)
 * Handles final evidence capture, fuel tickets and odometry synchronization.
 */
const RouteClosurePanel: React.FC<RouteAssignmentPanelProps> = ({
  formData,
  updateForm,
  isFinished,
}) => (
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

    <div className="bg-amber-50/30 border border-amber-200/50 p-3 rounded-[4px] space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
            KM / Horas Final
          </label>
          <div className="relative">
            <Gauge
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30"
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,000"
              value={formData.endReading === 0 ? '' : formData.endReading}
              onChange={(e): void => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                updateForm({ endReading: val === '' ? 0 : Number(val) });
              }}
              className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-amber-500 p-2.5 pl-10 text-xs font-black text-[#0f2a44] placeholder:text-[#0f2a44]/30 outline-none transition-colors rounded-[4px]"
              disabled={isFinished}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
            Litros Cargados
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
              value={formData.fuelLitersLoaded === 0 ? '' : formData.fuelLitersLoaded}
              onChange={(e): void => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                updateForm({ fuelLitersLoaded: val === '' ? 0 : Number(val) });
              }}
              className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-amber-500 p-2.5 pl-10 text-xs font-black text-[#0f2a44] placeholder:text-[#0f2a44]/30 outline-none transition-colors rounded-[4px]"
              disabled={isFinished}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
          Ticket de Combustible (Evidencia)
        </label>
        <ArchonImageUploader
          images={formData.fuelTicketImage ? [formData.fuelTicketImage] : []}
          onChange={(imgs): void => updateForm({ fuelTicketImage: imgs[0] || '' })}
          title="Capturar Ticket"
          maxImages={1}
          disabled={isFinished}
        />
      </div>
    </div>
  </motion.div>
);

export default React.memo(RouteClosurePanel);

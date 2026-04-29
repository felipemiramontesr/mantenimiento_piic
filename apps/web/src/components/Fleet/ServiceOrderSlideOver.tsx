import React from 'react';
import { X, Wrench } from 'lucide-react';
import ServiceRecordForm from './ServiceRecordForm';
import { FleetUnit } from '../../types/fleet';

interface ServiceOrderSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  unit: FleetUnit | null;
  onSuccess: () => void;
}

/**
 * 🔱 Archon Fleet: ServiceOrderSlideOver
 * Industrial container for maintenance reporting.
 */
const ServiceOrderSlideOver: React.FC<ServiceOrderSlideOverProps> = ({
  isOpen,
  onClose,
  unit,
  onSuccess,
}) => {
  if (!isOpen || !unit) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0f2a44]/60 backdrop-blur-md transition-opacity duration-500"
        onClick={onClose}
      />

      {/* Slide Panel */}
      <div className="relative w-full max-w-[85vw] bg-[#f8fafc] shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-white/20">
        {/* Header UI */}
        <div className="p-8 bg-[#0f2a44] text-white flex items-center justify-between shadow-lg relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-[#f2b705] rounded flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Wrench size={24} className="text-[#0f2a44]" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-[0.2em]">
                Registro de Mantenimiento
              </h2>
              <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest opacity-80">
                Protocolo de Cumplimiento Industrial • Archon Alpha
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-full transition-all group"
          >
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Form Container */}
        <div className="flex-1 overflow-y-auto p-12 bg-slate-50/50">
          <div className="max-w-[1200px] mx-auto">
            <ServiceRecordForm
              unitId={unit.uuid}
              unitTag={unit.id}
              currentOdometer={unit.odometer}
              onSuccess={(): void => {
                onSuccess();
                onClose();
              }}
              onCancel={(): void => onClose()}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceOrderSlideOver;

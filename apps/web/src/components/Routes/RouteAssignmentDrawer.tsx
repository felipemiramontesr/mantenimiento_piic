import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Navigation,
  User,
  Truck,
  MapPin,
  Gauge,
  Droplets,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';
import ArchonSelect from '../ArchonSelect';

interface RouteAssignmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 🔱 ARCHON ROUTE ASSIGNMENT DRAWER
 * Architecture: Sovereign Dispatch System
 * Purpose: High-precision route creation & active asset tracking.
 */
const RouteAssignmentDrawer: React.FC<RouteAssignmentDrawerProps> = ({ isOpen, onClose }) => {
  const { units } = useFleet();
  const { users } = useUsers();

  const [formData, setFormData] = useState({
    unitId: '',
    operatorId: '',
    origin: 'Arian Silver Zacatecas',
    destination: '',
    description: '',
    fuelLevel: 100,
  });

  const [selectedUnitData, setSelectedUnitData] = useState<
    import('../../types/fleet').FleetUnit | null
  >(null);

  // Sync unit data when selection changes
  useEffect((): void => {
    if (formData.unitId) {
      const unit = units.find((u) => u.id === formData.unitId);
      setSelectedUnitData(unit);
    } else {
      setSelectedUnitData(null);
    }
  }, [formData.unitId, units]);

  // Filter only available units
  const availableUnits = units
    .filter((u) => u.status === 'Disponible')
    .map((u) => ({
      value: u.id,
      label: `${u.id} - ${u.marca} ${u.modelo}`,
    }));

  // Map users for selection
  const operatorOptions = users.map((u) => ({
    value: u.id,
    label: `${u.fullName} (${u.employeeNumber || 'S/N'})`,
  }));

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    // Logic for dispatch will be implemented in next phase
    // TODO: Implement API call
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0f2a44]/60 backdrop-blur-sm z-[1000]"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-[500px] bg-white shadow-2xl z-[1001] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <header className="p-6 bg-[#0f2a44] text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <Navigation className="text-emerald-400" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tighter leading-none">
                    Orden de Despacho
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest opacity-60 font-bold">
                    Control de Salida de Activos
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </header>

            {/* Body */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar"
            >
              {/* SECTION 1: IDENTIDAD */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck size={16} className="text-[#0f2a44]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0f2a44]">
                    Sección I: Identidad del Servicio
                  </span>
                </div>

                {/* Unidad Select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
                    Seleccionar Unidad
                  </label>
                  <ArchonSelect
                    options={availableUnits}
                    value={formData.unitId}
                    onChange={(val): void => setFormData({ ...formData, unitId: val })}
                    icon={Truck}
                    placeholder="Buscar clave o modelo..."
                  />
                  {selectedUnitData && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#0f2a44]/5 p-3 rounded border-l-4 border-emerald-500 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded border flex items-center justify-center overflow-hidden">
                          <img
                            src={
                              selectedUnitData.images?.[0] ||
                              'https://via.placeholder.com/100x100?text=UNIT'
                            }
                            alt="Unit"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-[#0f2a44]">
                            {selectedUnitData.marca} {selectedUnitData.modelo}
                          </p>
                          <p className="text-[9px] font-bold opacity-50">
                            {selectedUnitData.placas} • {selectedUnitData.departamento}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-emerald-600">DISPONIBLE</p>
                        <p className="text-[9px] font-bold opacity-40">Status Activo</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Operador Select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
                    Operador Asignado
                  </label>
                  <ArchonSelect
                    options={operatorOptions}
                    value={formData.operatorId}
                    onChange={(val): void => setFormData({ ...formData, operatorId: val })}
                    icon={User}
                    placeholder="Buscar por nombre o nómina..."
                  />
                </div>
              </div>

              {/* SECTION 2: LOGÍSTICA */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={16} className="text-[#0f2a44]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0f2a44]">
                    Sección II: Misión y Destino
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
                      Origen
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formData.origin}
                      className="w-full bg-[#0f2a44]/5 border-b-2 border-[#0f2a44]/10 p-3 text-xs font-bold text-[#0f2a44] outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
                      Destino
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Mina Nivel 400"
                      value={formData.destination}
                      onChange={(e): void =>
                        setFormData({ ...formData, destination: e.target.value })
                      }
                      className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-emerald-500 p-3 text-xs font-bold text-[#0f2a44] outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
                    Motivo de Ruta / Observaciones
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Descripción detallada de la msisión..."
                    value={formData.description}
                    onChange={(e): void =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-emerald-500 p-3 text-xs font-bold text-[#0f2a44] outline-none transition-colors resize-none"
                  />
                </div>
              </div>

              {/* SECTION 3: ESTADO TÉCNICO */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Gauge size={16} className="text-[#0f2a44]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0f2a44]">
                    Sección III: Telemetría Inicial
                  </span>
                </div>

                <div className="bg-[#0f2a44]/5 p-6 rounded-lg space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Gauge size={20} className="text-[#0f2a44]/40" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-tighter text-[#0f2a44]">
                          Lectura de Odómetro
                        </p>
                        <p className="text-[9px] font-bold opacity-50 uppercase">
                          Valor de entrada (KM)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#0f2a44] tracking-tighter">
                        {selectedUnitData
                          ? Number(selectedUnitData.odometer).toLocaleString()
                          : '0,000'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Droplets size={20} className="text-emerald-500" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-tighter text-[#0f2a44]">
                            Nivel de Combustible
                          </p>
                          <p className="text-[9px] font-bold opacity-50 uppercase">
                            Estado al momento de salida
                          </p>
                        </div>
                      </div>
                      <p className="text-xl font-black text-emerald-600 tracking-tighter">
                        {formData.fuelLevel}%
                      </p>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="25"
                      value={formData.fuelLevel}
                      onChange={(e): void =>
                        setFormData({ ...formData, fuelLevel: Number(e.target.value) })
                      }
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-[9px] font-bold text-[#0f2a44] opacity-40 px-1">
                      <span>E</span>
                      <span>1/4</span>
                      <span>1/2</span>
                      <span>3/4</span>
                      <span>F</span>
                    </div>
                  </div>
                </div>

                {/* Validation Hint */}
                <div className="flex gap-3 p-4 bg-amber-50 rounded border border-amber-200">
                  <AlertCircle size={18} className="text-amber-600 shrink-0" />
                  <p className="text-[10px] font-bold text-amber-800 leading-relaxed">
                    Al confirmar, el estatus de la unidad cambiará automáticamente a{' '}
                    <span className="font-black underline">EN RUTA</span>. El operador será
                    responsable del activo hasta su regreso a base.
                  </p>
                </div>
              </div>
            </form>

            {/* Footer */}
            <footer className="p-6 border-t bg-gray-50 flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 text-[11px] font-black uppercase tracking-widest text-[#0f2a44] border-2 border-[#0f2a44]/10 hover:bg-[#0f2a44]/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.unitId || !formData.operatorId || !formData.destination}
                className="flex-[2] px-6 py-4 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
              >
                Autorizar Despacho <ChevronRight size={14} />
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RouteAssignmentDrawer;

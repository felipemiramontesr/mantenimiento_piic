import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Navigation,
  User,
  Truck,
  MapPin,
  Gauge,
  Droplets,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  X,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';
import ArchonSelect from '../ArchonSelect';
import { RouteLog } from './RouteLogTable';

interface RouteAssignmentFormProps {
  onClose: () => void;
  routeToEdit?: RouteLog | null;
}

/**
 * 🔱 ARCHON ROUTE ASSIGNMENT FORM
 * Architecture: Sovereign Integrated Component
 * Purpose: High-precision route creation & rectification in main chassis.
 * Version: 38.0.0 - Archon Obsidian Cluster (Instrumental Refinement)
 */
const RouteAssignmentForm: React.FC<RouteAssignmentFormProps> = ({ onClose, routeToEdit }) => {
  const { units } = useFleet();
  const { users } = useUsers();

  const [fuelMode, setFuelMode] = useState<'percentage' | 'liters'>('percentage');
  const [formData, setFormData] = useState({
    unitId: '',
    operatorId: '',
    origin: 'Arian Silver Zacatecas',
    destination: '',
    description: '',
    odometer: 0,
    fuelLevel: 50,
    fuelLiters: 0,
  });

  const isEdit = !!routeToEdit;

  // Populate form for edit mode
  useEffect((): void => {
    if (routeToEdit) {
      setFormData({
        unitId: routeToEdit.unit_id,
        operatorId: routeToEdit.operator_id,
        origin: routeToEdit.origin || 'Arian Silver Zacatecas',
        destination: routeToEdit.destination,
        description: routeToEdit.description || '',
        odometer: routeToEdit.odometer || 0,
        fuelLevel: routeToEdit.fuelLevel || 50,
        fuelLiters: routeToEdit.fuelLiters || 0,
      });
    } else {
      setFormData({
        unitId: '',
        operatorId: '',
        origin: 'Arian Silver Zacatecas',
        destination: '',
        description: '',
        odometer: 0,
        fuelLevel: 50,
        fuelLiters: 0,
      });
    }
  }, [routeToEdit]);

  const [selectedUnitData, setSelectedUnitData] = useState<
    import('../../types/fleet').FleetUnit | null
  >(null);

  // Sync unit data when selection changes
  useEffect((): void => {
    if (formData.unitId) {
      const unit = units.find((u) => u.id === formData.unitId);
      setSelectedUnitData(unit || null);
    } else {
      setSelectedUnitData(null);
    }
  }, [formData.unitId, units]);

  // Filter only available units (allow current unit if editing)
  const availableUnits = units
    .filter((u) => u.status === 'Disponible' || (isEdit && u.id === routeToEdit?.unit_id))
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
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-pro bg-white overflow-hidden border border-[rgba(15,42,68,0.1)] shadow-xl rounded-[4px] w-full !p-0"
    >
      {/* Header Integrado */}
      <header
        className={`py-3 px-6 text-white flex items-center justify-between rounded-t-[4px] border -m-[1px] ${
          isEdit ? 'bg-[#0f2a44] border-[#0f2a44]' : 'bg-emerald-600 border-emerald-600'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-white/20 border border-white/40 flex items-center justify-center">
            <Navigation className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tighter leading-none">
              {isEdit ? 'Rectificación de Ruta' : 'Orden de Despacho'}
            </h2>
            <p className="text-[10px] uppercase tracking-widest opacity-60 font-bold">
              {isEdit ? 'Edición de información operativa' : 'Control de Salida de Activos'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-[4px] hover:bg-white/10 flex items-center justify-center transition-colors border border-white/20"
        >
          <X size={16} />
        </button>
      </header>

      {/* Body Integrado */}
      <form onSubmit={handleSubmit} className="py-5 px-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* COLUMNA 1: IDENTIDAD Y MISIÓN */}
          <div className="space-y-4 flex flex-col h-full">
            {/* SECTION 1: IDENTIDAD */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-[#0f2a44]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44]">
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
                  placeholder="Clave o modelo..."
                />
                {selectedUnitData && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0f2a44]/5 p-2 rounded-[4px] border-l-4 border-emerald-500 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-[4px] border flex items-center justify-center overflow-hidden">
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

            {/* SECTION 2: MISIÓN Y DESTINO */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={14} className="text-[#0f2a44]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44]">
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
                    className="w-full bg-[#0f2a44]/5 border-b-2 border-[#0f2a44]/10 p-3 text-xs font-bold text-[#0f2a44] outline-none rounded-[4px]"
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
                    className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-emerald-500 p-3 text-xs font-bold text-[#0f2a44] outline-none transition-colors rounded-[4px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <textarea
                  rows={2}
                  placeholder="Observaciones de la misión..."
                  value={formData.description}
                  onChange={(e): void => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white border-2 border-[#0f2a44]/5 focus:border-emerald-500 p-3 text-xs font-bold text-[#0f2a44] outline-none transition-colors resize-none rounded-[4px]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 flex flex-col h-full">
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Gauge size={14} className="text-[#0f2a44]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44]">
                  Sección III: Información de Consumo
                </span>
              </div>

              <div className="space-y-2 flex-1 flex flex-col">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
                  Telemetría Inicial
                </label>
                <div className="bg-[#0f2a44]/5 p-6 rounded-[4px] flex-1 flex flex-col justify-between border border-[#0f2a44]/5 relative overflow-hidden group">
                  {/* Glass Background Overlay */}
                  <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                  {/* NIVEL 1: ODÓMETRO (HUD INTEGRATION) */}
                  <div className="relative z-10 flex items-center justify-between bg-white/80 p-4 rounded-[4px] border border-[#0f2a44]/5 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-[4px] bg-[#0f2a44]/5 flex items-center justify-center">
                        <Gauge size={20} className="text-[#0f2a44]/60" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40 mb-0.5">
                          Lectura Actual
                        </p>
                        <p className="text-2xl font-black text-[#0f2a44] tracking-tighter flex items-baseline gap-1">
                          {selectedUnitData
                            ? Number(selectedUnitData.odometer).toLocaleString()
                            : '0,000'}
                          <span className="text-[10px] opacity-40 font-bold uppercase tracking-tighter">
                            KM
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* NIVEL 2: SEGMENTED SELECTOR (SENIOR INTERACTION) */}
                  <div className="relative z-10 flex justify-center my-6">
                    <div className="bg-[#0f2a44]/10 p-1 rounded-[4px] flex gap-1 relative w-full max-w-[280px]">
                      {/* Sliding Pill */}
                      <motion.div
                        initial={false}
                        animate={{ x: fuelMode === 'percentage' ? 0 : '102%' }}
                        className="absolute inset-y-1 left-1 w-[48%] bg-[#0f2a44] rounded-[3px] shadow-lg shadow-blue-900/20"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />

                      <button
                        type="button"
                        onClick={(): void => setFuelMode('percentage')}
                        className={`relative z-20 flex-1 py-2 text-[9px] font-black uppercase tracking-[0.15em] transition-colors duration-300 ${
                          fuelMode === 'percentage'
                            ? 'text-white'
                            : 'text-[#0f2a44] opacity-50 hover:opacity-100'
                        }`}
                      >
                        Porcentaje %
                      </button>
                      <button
                        type="button"
                        onClick={(): void => setFuelMode('liters')}
                        className={`relative z-20 flex-1 py-2 text-[9px] font-black uppercase tracking-[0.15em] transition-colors duration-300 ${
                          fuelMode === 'liters'
                            ? 'text-white'
                            : 'text-[#0f2a44] opacity-50 hover:opacity-100'
                        }`}
                      >
                        Litros (L)
                      </button>
                    </div>
                  </div>

                  {/* NIVEL 3: EL CANAL DE COMBUSTIBLE DUAL (CROSSFADE TRANSITION) */}
                  <div className="relative z-10 flex-1 flex flex-col justify-end min-h-[120px]">
                    <AnimatePresence mode="wait">
                      {fuelMode === 'percentage' ? (
                        <motion.div
                          key="percentage"
                          initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                          transition={{ duration: 0.3 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Droplets size={16} className="text-emerald-500" />
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]">
                                Nivel de Combustible
                              </p>
                            </div>
                            <p className="text-xl font-black text-emerald-600 tracking-tighter">
                              {formData.fuelLevel}%
                            </p>
                          </div>

                          <div className="relative pt-2">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="25"
                              value={formData.fuelLevel}
                              onChange={(e): void =>
                                setFormData({ ...formData, fuelLevel: Number(e.target.value) })
                              }
                              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#0f2a44]/5 rounded-full appearance-none"
                            />
                            <div className="flex justify-between text-[8px] font-black text-[#0f2a44] opacity-30 px-1 mt-3 tracking-widest">
                              <span>VACÍO</span>
                              <span>1/4</span>
                              <span>1/2</span>
                              <span>3/4</span>
                              <span>LLENO</span>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="liters"
                          initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                          transition={{ duration: 0.3 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Droplets size={16} className="text-blue-500" />
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]">
                                Volumen de Carga
                              </p>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-[4px] border border-[#0f2a44]/10">
                              <input
                                type="number"
                                placeholder="0"
                                value={formData.fuelLiters || ''}
                                onChange={(e): void =>
                                  setFormData({ ...formData, fuelLiters: Number(e.target.value) })
                                }
                                className="w-14 text-right text-xs font-black text-[#0f2a44] outline-none"
                              />
                              <span className="text-[9px] font-black text-[#0f2a44] opacity-40">
                                L
                              </span>
                            </div>
                          </div>

                          {/* TANQUE HORIZONTAL SENIOR (LCD CRYSTAL FINISH) */}
                          <div className="relative pt-1">
                            <div className="h-8 w-full bg-[#0f2a44]/5 rounded-[4px] border border-[#0f2a44]/10 relative overflow-hidden p-1 shadow-inner">
                              <motion.div
                                initial={false}
                                animate={{
                                  width: `${Math.min((formData.fuelLiters / 500) * 100, 100)}%`,
                                }}
                                className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-400 relative rounded-[2px] shadow-sm"
                                transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                              >
                                {/* LCD Gloss Reflection */}
                                <div className="absolute inset-x-0 top-0 h-[40%] bg-white/20 rounded-t-[1px]" />
                                <div className="absolute inset-x-0 bottom-0 h-[20%] bg-black/10 rounded-b-[1px]" />
                              </motion.div>

                              {/* Precise Measurement Ticks */}
                              <div className="absolute inset-0 flex justify-between px-2 pointer-events-none">
                                {[...Array(21)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`h-full w-[1px] bg-[#0f2a44] ${
                                      i % 5 === 0 ? 'opacity-20' : 'opacity-5 h-[40%] self-center'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex justify-between text-[8px] font-black text-[#0f2a44] opacity-30 px-1 mt-3 tracking-[0.2em]">
                              <span>0 L</span>
                              <span>250 L</span>
                              <span>500 L</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Hint */}
            <div className="flex gap-2 p-3 bg-amber-50 rounded-[4px] border border-amber-200">
              <AlertCircle size={14} className="text-amber-600 shrink-0" />
              <p className="text-[9px] font-bold text-amber-800 leading-relaxed">
                Al confirmar, el estatus de la unidad cambiará automáticamente a{' '}
                <span className="font-black underline">EN RUTA</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Integrado - Senior Block Alignment */}
        <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-8">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all rounded-[4px] border-none outline-none"
          >
            Terminar Ruta
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.unitId || !formData.operatorId || !formData.destination}
            className={`w-full px-6 py-4 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg rounded-[4px] border-none outline-none ${
              isEdit
                ? 'bg-[#0f2a44] hover:bg-[#1a3a5a] shadow-blue-900/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            {isEdit ? 'Guardar Cambios' : 'Autorizar Despacho'} <ChevronRight size={14} />
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default RouteAssignmentForm;

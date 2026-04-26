import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
 * Version: 37.5.0 - Consumption Node Harmonization
 */
const RouteAssignmentForm: React.FC<RouteAssignmentFormProps> = ({ onClose, routeToEdit }) => {
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
        fuelLevel: routeToEdit.fuelLevel || 100,
      });
    } else {
      setFormData({
        unitId: '',
        operatorId: '',
        origin: 'Arian Silver Zacatecas',
        destination: '',
        description: '',
        fuelLevel: 100,
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
      className="glass-card-pro bg-white overflow-hidden border border-[rgba(15,42,68,0.1)] shadow-xl rounded-[4px] w-full !p-0 min-h-[760px] mb-20 flex flex-col"
    >
      {/* Header Integrado */}
      <header
        className={`py-3 px-6 text-white flex items-center justify-between rounded-t-[4px] border ${
          isEdit ? 'bg-[#0f2a44] border-[#0f2a44]' : 'bg-emerald-600 border-emerald-600'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-white/20 border border-white/40 flex items-center justify-center">
            <Navigation className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tighter leading-none">
              Control de Salida de Activos
            </h2>
          </div>
        </div>
      </header>

      {/* Body Integrado */}
      <form onSubmit={handleSubmit} className="py-5 px-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* COLUMNA 1: IDENTIDAD Y MISIÓN */}
          <div className="space-y-4">
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

          <div className="space-y-4">
            {/* SECTION 3: CONSUMO */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Gauge size={14} className="text-[#0f2a44]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44]">
                  Sección III: Información de Consumo
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
                  Telemetría Inicial
                </label>
                <div className="bg-[#0f2a44]/5 p-4 rounded-[4px] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Gauge size={20} className="text-[#0f2a44]/40" />
                      <p className="text-2xl font-black text-[#0f2a44] tracking-tighter">
                        {selectedUnitData
                          ? Number(selectedUnitData.odometer).toLocaleString()
                          : '0,000'}{' '}
                        <span className="text-[10px] opacity-40 font-bold ml-1">KM</span>
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

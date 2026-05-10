import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Truck, User, AlertCircle } from 'lucide-react';
import ArchonSelect from '../../ArchonSelect';
import { RouteIdentityPanelProps } from './types';

/**
 * 🔱 Archon Panel: Route Identity (Fase I)
 * Handles unit allocation and pilot assignment with real-time validation hints.
 */
const RouteIdentityPanel: React.FC<RouteIdentityPanelProps> = ({
  formData,
  updateForm,
  isEdit,
  isFinished,
  availableUnits,
  operatorOptions,
  selectedUnitData,
}) => (
  <div className="space-y-4">
    {/* Header */}
    <div className="flex items-center gap-3">
      <div className="bg-[#0f2a44] p-2 rounded-[4px]">
        <ShieldCheck size={20} className="text-white" />
      </div>
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-50">
          Fase I
        </span>
        <h3 className="text-[14px] font-black uppercase tracking-tight text-[#0f2a44]">
          Identidad del Servicio
        </h3>
      </div>
    </div>

    {/* Unit Selection */}
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
        Seleccionar Unidad
      </label>
      <ArchonSelect
        options={availableUnits}
        value={formData.unitId}
        onChange={(val): void => updateForm({ unitId: val })}
        icon={Truck}
        placeholder="Clave o modelo..."
        disabled={isEdit}
      />
      {selectedUnitData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#0f2a44]/5 p-2 rounded-[4px] border-l-4 border-emerald-500 flex items-center gap-4"
        >
          <div className="w-20 h-20 bg-white rounded-[4px] border-2 border-[#0f2a44]/10 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {selectedUnitData.images?.[0] ? (
              <img
                src={selectedUnitData.images[0]}
                alt="Unit"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center opacity-20">
                <Truck size={32} className="text-[#0f2a44]" />
                <span className="text-[7px] font-black uppercase tracking-tighter mt-1">
                  No Media
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-black text-[#0f2a44] truncate leading-tight">
              {selectedUnitData.marca} {selectedUnitData.modelo}
            </p>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/50 px-1.5 rounded uppercase">
                {selectedUnitData.id}
              </span>
              <span className="text-[10px] font-bold opacity-60 text-[#0f2a44]">
                {selectedUnitData.placas}
              </span>
              {selectedUnitData.lastFuelLevel !== undefined && !isEdit && (
                <span className="text-[10px] font-bold text-sky-700 bg-sky-100/50 px-1.5 rounded uppercase">
                  Telemetría Heredada: {selectedUnitData.lastFuelLevel}%
                </span>
              )}
            </div>
            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest mt-1">
              {selectedUnitData.departamento}
            </p>
          </div>
        </motion.div>
      )}
    </div>

    {/* Operator Selection */}
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
        Operador Asignado
      </label>
      <ArchonSelect
        options={operatorOptions}
        value={formData.operatorId}
        onChange={(val): void => updateForm({ operatorId: val })}
        icon={User}
        placeholder="Buscar por nombre o nómina..."
      />
    </div>

    {/* Validation Hint */}
    {!isFinished && (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-3 p-2.5 rounded-[4px] border ${
          isEdit ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
        }`}
      >
        <AlertCircle
          size={14}
          className={`${isEdit ? 'text-amber-600' : 'text-emerald-600'} shrink-0 mt-0.5`}
        />
        <p
          className={`text-[9px] font-bold ${
            isEdit ? 'text-amber-800' : 'text-emerald-800'
          } leading-relaxed`}
        >
          {isEdit ? (
            <>
              Al finalizar, el kilometraje de la unidad se actualizará a{' '}
              <span className="font-black text-amber-900">
                {Number(formData.endReading).toLocaleString()} KM
              </span>{' '}
              y quedará disponible para despacho.
            </>
          ) : (
            <>
              Al confirmar el despacho, el estatus de la unidad cambiará automáticamente a{' '}
              <span className="font-black underline text-emerald-900">EN RUTA</span>.
            </>
          )}
        </p>
      </motion.div>
    )}
  </div>
);

export default React.memo(RouteIdentityPanel);

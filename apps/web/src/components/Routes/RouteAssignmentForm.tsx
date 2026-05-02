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
  Camera,
  CheckCircle2,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';
import ArchonSelect from '../ArchonSelect';
import { RouteLog } from './RouteLogTable';
import { CatalogOption } from '../../types/fleet';
import { archonCache } from '../../utils/archonCache';
import api from '../../api/client';
import ArchonImageUploader from '../ArchonImageUploader';

interface RouteAssignmentFormProps {
  onClose: () => void;
  routeToEdit?: RouteLog | null;
}

/**
 * 🔱 ARCHON ROUTE ASSIGNMENT FORM
 * Architecture: Sovereign Integrated Component
 * Purpose: High-precision route creation & rectification in main chassis.
 * Version: 38.3.0 - Forensic Evidence Capture Integration
 */
const RouteAssignmentForm: React.FC<RouteAssignmentFormProps> = ({ onClose, routeToEdit }) => {
  const { units } = useFleet();
  const { users } = useUsers();

  const isEdit = !!routeToEdit;
  const isFinished = !!routeToEdit?.end_time;

  const [formData, setFormData] = useState({
    unitId: '',
    operatorId: '',
    origin: '',
    destination: '',
    description: '',
    fuelLevel: 100,
    // Closing Fields
    endReading: 0,
    fuelLitersLoaded: 0,
    fuelTicketImage: '',
  });

  const [origins, setOrigins] = useState<CatalogOption[]>(
    () => archonCache.get<CatalogOption[]>('route_origins') || []
  );

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
        endReading: routeToEdit.end_km || 0,
        fuelLitersLoaded: routeToEdit.fuel_liters_loaded || 0,
        fuelTicketImage: routeToEdit.fuel_ticket_image || '',
      });
    } else {
      setFormData({
        unitId: '',
        operatorId: '',
        origin: 'Arian Silver Zacatecas',
        destination: '',
        description: '',
        fuelLevel: 100,
        endReading: 0,
        fuelLitersLoaded: 0,
        fuelTicketImage: '',
      });
    }
  }, [routeToEdit]);

  const [selectedUnitData, setSelectedUnitData] = useState<
    import('../../types/fleet').FleetUnit | null
  >(null);

  // Hydrate Origins
  useEffect(() => {
    const fetchOrigins = async (): Promise<void> => {
      try {
        const res = await api.get('/catalogs/ROUTE_ORIGIN');
        const data = res.data?.data || res.data || [];
        setOrigins(data);
        archonCache.set('route_origins', data);
        if (data.length > 0 && !formData.origin && !routeToEdit) {
          setFormData((prev) => ({ ...prev, origin: data[0].label }));
        }
      } catch (err) {
        // Fallback to default if everything fails
        if (origins.length === 0) {
          setOrigins([{ id: 1, label: 'Arian Silver Zacatecas' }]);
        }
      }
    };
    fetchOrigins();
  }, []);

  // Sync unit data when selection changes
  useEffect((): void => {
    if (formData.unitId) {
      const unit = units.find((u) => u.id === formData.unitId);
      setSelectedUnitData(unit || null);

      // Pre-fill endReading if editing and not yet set
      if (isEdit && unit && !formData.endReading) {
        setFormData((prev) => ({ ...prev, endReading: Number(unit.currentReading) }));
      }
    } else {
      setSelectedUnitData(null);
    }
  }, [formData.unitId, units, isEdit]);

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

  const { startRoute, finishRoute } = useFleet();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isFinished) {
      onClose();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (isEdit && routeToEdit) {
        // Execute Forensic Closure
        await finishRoute(routeToEdit.uuid, {
          endReading: Number(formData.endReading),
          fuelLitersLoaded: Number(formData.fuelLitersLoaded),
          fuelTicketImage: formData.fuelTicketImage || undefined,
        });
      } else {
        await startRoute({
          unitId: formData.unitId,
          driverId: Number(formData.operatorId),
          startReading: selectedUnitData?.currentReading || 0,
          destination: formData.destination,
          originId: origins.find((o) => o.label === formData.origin)?.id,
        });
      }
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error en la operación';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  let rightButtonText = 'Autorizar Despacho';
  if (isFinished) {
    rightButtonText = 'Cerrar Vista';
  } else if (isEdit) {
    rightButtonText = 'Finalizar Misión';
  }

  let startReadingDisplay = '0,000';
  if (isEdit) {
    startReadingDisplay = routeToEdit?.start_km.toLocaleString() || '0,000';
  } else if (selectedUnitData) {
    startReadingDisplay = Number(selectedUnitData.odometer).toLocaleString();
  }

  let submitButtonClass = 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20';
  if (isFinished) {
    submitButtonClass = 'bg-emerald-600 hover:bg-emerald-700';
  } else if (isEdit) {
    submitButtonClass = 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20';
  }

  const renderIdentitySection = (): React.ReactElement => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={14} className="text-[#0f2a44]" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44]">
          Sección I: Identidad del Servicio
        </span>
      </div>

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
          disabled={isEdit}
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
                    selectedUnitData.images?.[0] || 'https://via.placeholder.com/100x100?text=UNIT'
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
          disabled={isEdit}
        />
      </div>
    </div>
  );

  const renderMissionSection = (): React.ReactElement => (
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
          <ArchonSelect
            options={origins.map((o) => ({ value: o.label, label: o.label }))}
            value={formData.origin}
            onChange={(val): void => setFormData({ ...formData, origin: val })}
            icon={MapPin}
            disabled={isEdit}
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
            onChange={(e): void => setFormData({ ...formData, destination: e.target.value })}
            className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-emerald-500 p-3 text-xs font-bold text-[#0f2a44] outline-none transition-colors rounded-[4px] disabled:opacity-50"
            disabled={isEdit}
          />
        </div>
      </div>

      <div className="space-y-2">
        <textarea
          rows={2}
          placeholder="Observaciones de la misión..."
          value={formData.description}
          onChange={(e): void => setFormData({ ...formData, description: e.target.value })}
          className="w-full bg-white border-2 border-[#0f2a44]/5 focus:border-emerald-500 p-3 text-xs font-bold text-[#0f2a44] outline-none transition-colors resize-none rounded-[4px] disabled:opacity-50"
          disabled={isEdit}
        />
      </div>
    </div>
  );

  const renderTelemetrySection = (): React.ReactElement => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Gauge size={14} className="text-[#0f2a44]" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44]">
          Sección III: Telemetría de Salida
        </span>
      </div>

      <div className="space-y-2">
        <div className="bg-[#0f2a44]/5 p-4 rounded-[4px] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gauge size={20} className="text-[#0f2a44]/40" />
              <p className="text-2xl font-black text-[#0f2a44] tracking-tighter">
                {startReadingDisplay}{' '}
                <span className="text-[10px] opacity-40 font-bold ml-1">KM</span>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Droplets size={20} className="text-emerald-500" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-tighter text-[#0f2a44]">
                    Nivel de Combustible
                  </p>
                </div>
              </div>
              <p className="text-xl font-black text-emerald-600 tracking-tighter">
                {formData.fuelLevel}%
              </p>
            </div>
            {!isEdit && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderClosureSection = (): React.ReactElement => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <Camera size={14} className="text-amber-500" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44]">
          Sección IV: Evidencia y Cierre de Misión
        </span>
      </div>

      <div className="bg-amber-50/30 border border-amber-200/50 p-4 rounded-[4px] space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
              KM / Horas Final
            </label>
            <div className="relative">
              <Gauge
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30"
              />
              <input
                type="number"
                placeholder="0,000"
                value={formData.endReading}
                onChange={(e): void =>
                  setFormData({ ...formData, endReading: Number(e.target.value) })
                }
                className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-amber-500 p-3 pl-10 text-xs font-black text-[#0f2a44] outline-none transition-colors rounded-[4px]"
                disabled={isFinished}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
              Litros Cargados
            </label>
            <div className="relative">
              <Droplets
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0f2a44]/30"
              />
              <input
                type="number"
                placeholder="0.00"
                value={formData.fuelLitersLoaded}
                onChange={(e): void =>
                  setFormData({ ...formData, fuelLitersLoaded: Number(e.target.value) })
                }
                className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-amber-500 p-3 pl-10 text-xs font-black text-[#0f2a44] outline-none transition-colors rounded-[4px]"
                disabled={isFinished}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
            Ticket de Combustible (Evidencia)
          </label>
          <ArchonImageUploader
            value={formData.fuelTicketImage}
            onChange={(img): void => setFormData({ ...formData, fuelTicketImage: img })}
            label="Capturar Ticket"
            disabled={isFinished}
          />
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-pro bg-white overflow-hidden border border-[rgba(15,42,68,0.1)] shadow-xl rounded-[4px] w-full !p-0 mb-10 flex flex-col"
    >
      {/* Header Integrado */}
      <header
        className={`py-3 px-6 text-white flex items-center justify-between rounded-t-[4px] border ${
          isEdit ? 'bg-[#0f2a44] border-[#0f2a44]' : 'bg-emerald-600 border-emerald-600'
        }`}
      >
        <div className="flex items-center gap-3">
          <Navigation className="text-white shrink-0" size={20} />
          <h2 className="text-lg font-black uppercase tracking-tighter leading-none">
            {isEdit ? 'Rectificación y Cierre de Misión' : 'Control de Salida de Activos'}
          </h2>
        </div>
      </header>

      {/* Body Integrado */}
      <form onSubmit={handleSubmit} className="py-5 px-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* COLUMNA 1: IDENTIDAD Y MISIÓN */}
          <div className="space-y-6">
            {renderIdentitySection()}
            {renderMissionSection()}
          </div>

          <div className="space-y-6">
            {renderTelemetrySection()}
            {isEdit && renderClosureSection()}
          </div>

          {/* Validation Hint */}
          {!isFinished && (
            <div
              className={`flex gap-2 p-3 rounded-[4px] border ${
                isEdit ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <AlertCircle
                size={14}
                className={`${isEdit ? 'text-amber-600' : 'text-emerald-600'} shrink-0`}
              />
              <p
                className={`text-[9px] font-bold ${
                  isEdit ? 'text-amber-800' : 'text-emerald-800'
                } leading-relaxed`}
              >
                {isEdit ? (
                  <>
                    Al finalizar, el kilometraje de la unidad se actualizará a{' '}
                    <span className="font-black">
                      {Number(formData.endReading).toLocaleString()} KM
                    </span>{' '}
                    y quedará disponible para despacho.
                  </>
                ) : (
                  <>
                    Al confirmar, el estatus de la unidad cambiará automáticamente a{' '}
                    <span className="font-black underline">EN RUTA</span>.
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-2 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-[10px] font-bold flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Footer Integrado - Senior Block Alignment */}
        <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-8 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#0f2a44] bg-gray-100 hover:bg-gray-200 transition-all rounded-[4px] border-none outline-none disabled:opacity-50"
            disabled={submitting}
          >
            {isFinished ? 'Volver a Bitácora' : 'Cancelar'}
          </button>
          <button
            type="submit"
            disabled={
              submitting ||
              (!isFinished &&
                (!formData.unitId ||
                  !formData.operatorId ||
                  !formData.destination ||
                  (isEdit && !formData.endReading)))
            }
            className={`w-full px-6 py-4 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg rounded-[4px] border-none outline-none ${submitButtonClass}`}
          >
            {submitting && 'Procesando...'}
            {!submitting && isFinished && (
              <>
                Misión Completada <CheckCircle2 size={14} />
              </>
            )}
            {!submitting && !isFinished && (
              <>
                {rightButtonText} <ChevronRight size={14} />
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default RouteAssignmentForm;

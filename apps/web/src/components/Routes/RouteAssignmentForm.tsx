import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Truck,
  MapPin,
  Gauge,
  Droplets,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Camera,
  Trash2,
  Save,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';
import ArchonSelect from '../ArchonSelect';
import { RouteLog } from './RouteLogTable';
import { CatalogOption } from '../../types/fleet';
import { archonCache } from '../../utils/archonCache';
import api from '../../api/client';
import ArchonImageUploader from '../ArchonImageUploader';
import ArchonFuelSensor from './ArchonFuelSensor';
import FuelVolumeChart from './FuelVolumeChart';
import AuditJustificationModal from '../Common/AuditJustificationModal';

/**
 * 🔱 Archon Component: RouteAssignmentForm
 * Implementation: Sovereign Asset Dispatch Command Center (v.42.7.0)
 *
 * CORE ARCHITECTURE:
 * - Mission Control: Orchestrates unit identity, operator assignment, and mission objectives.
 * - Telemetry Integration: Real-time synchronization with volumetric and odometry sensors.
 * - Single-Screen UX: Compact, high-density layout designed for industrial control environments.
 * - Security: Implements strict validation to prevent unauthorized network requests (Anti-Ghost 400).
 */
interface RouteAssignmentFormProps {
  /** Modal closure handler */
  onClose: () => void;
  /** Route record used for rectification or mission closure */
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

  // 🔱 Forensic Availability Engine: Tracking Busy Operators & Units
  const [activeRoutes, setActiveRoutes] = useState<RouteLog[]>([]);

  useEffect(() => {
    const fetchActiveRoutes = async (): Promise<void> => {
      try {
        const res = await api.get('/routes');
        const active = (res.data?.data || []).filter((r: RouteLog) => !r.end_time);
        setActiveRoutes(active);
      } catch (err) {
        // Silent fail
      }
    };
    fetchActiveRoutes();
  }, []);

  // 📐 Natural Sort Helper (Cockpit Standard)
  const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  // ⛽ Refined Available Units Selection (v.22.2.0)
  const availableUnits = useMemo(
    () =>
      units
        .filter((u) => u.status === 'Disponible' || (isEdit && u.id === routeToEdit?.unit_id))
        .sort((a, b) => naturalCollator.compare(a.id, b.id))
        .map((u) => ({
          value: u.id,
          label: `${u.id} - ${u.marca} ${u.modelo}`,
          secondaryLabel: `ODO: ${Number(u.odometer || 0).toLocaleString()} KM | ${u.placas}`,
          searchTerms: `${u.marca} ${u.modelo} ${u.placas} ${u.departamento}`,
        })),
    [units, isEdit, routeToEdit]
  );

  // 👤 Universal Pilot Access: All users, filtered by active mission occupancy
  const operatorOptions = useMemo(() => {
    const busyUserIds = activeRoutes.map((r) => r.operator_id);

    return users
      .filter((u) => !busyUserIds.includes(u.id) || (isEdit && u.id === routeToEdit?.operator_id))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((u) => ({
        value: u.id,
        label: u.fullName,
        secondaryLabel: `${u.roleName?.toUpperCase() || 'USUARIO'} | NÓMINA: ${
          u.employeeNumber || 'S/N'
        }`,
        searchTerms: `${u.employeeNumber || ''} ${u.roleName || ''} ${u.email || ''}`,
      }));
  }, [users, activeRoutes, isEdit, routeToEdit]);

  const { startRoute, finishRoute } = useFleet();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditAction, setAuditAction] = useState<'UPDATE' | 'DELETE'>('UPDATE');

  const handleConfirmAudit = async (reason: string): Promise<void> => {
    setSubmitting(true);
    try {
      if (auditAction === 'UPDATE') {
        await api.put(`/routes/${routeToEdit?.uuid}`, {
          data: formData,
          reason,
        });
      } else {
        await api.delete(`/routes/${routeToEdit?.uuid}`, {
          data: { reason },
        });
      }
      onClose();
    } catch (err) {
      setError('Error en el protocolo de auditoría');
    } finally {
      setSubmitting(false);
      setIsAuditModalOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isFinished) {
      // Infinished routes need audit to be modified
      setAuditAction('UPDATE');
      setIsAuditModalOpen(true);
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
          startReading: Number(selectedUnitData?.odometer || 0),
          destination: formData.destination,
          originId: origins.find((o) => o.label === formData.origin)?.id
            ? Number(origins.find((o) => o.label === formData.origin)?.id)
            : undefined,
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
    <div className="space-y-8">
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

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
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
              </div>
              <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest mt-1">
                {selectedUnitData.departamento}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
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

      {/* 🟢 RELOCATED VALIDATION HINT (Now immediately after description) */}
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

  const selectedUnit = units.find((u) => u.id === formData.unitId);
  const tankCapacity = selectedUnit?.fuelTankCapacity || 0;

  const getFuelColor = (level: number): string => {
    if (level >= 87.5) return '#22c55e';
    if (level >= 62.5) return '#facc15';
    if (level >= 37.5) return '#f97316';
    if (level >= 12.5) return '#ef4444';
    return '#a855f7';
  };

  const renderMissionSection = (): React.ReactElement => (
    <div className="space-y-8 pt-8 border-t border-[#0f2a44]/5">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-600 p-2 rounded-[4px]">
          <MapPin size={20} className="text-white" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 opacity-50">
            Fase II
          </span>
          <h3 className="text-[14px] font-black uppercase tracking-tight text-[#0f2a44]">
            Misión y Destino
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
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
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
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

  const renderTelemetrySection = (): React.ReactElement => {
    if (!formData.unitId) {
      return (
        <div className="space-y-4 opacity-50">
          <div className="flex items-center gap-2 h-4">
            <Gauge size={14} className="text-[#0f2a44]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44]">
              Sección III: Telemetría de Salida
            </span>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
              PARAMETRÍA DE SENSORES
            </label>
            <div className="bg-[#0f2a44]/5 p-8 rounded-[4px] border-2 border-dashed border-[#0f2a44]/10 flex flex-col items-center justify-center text-center">
              <AlertCircle size={24} className="text-[#0f2a44]/20 mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]/40">
                SISTEMA DESCONECTADO
              </p>
              <p className="text-[8px] font-bold text-[#0f2a44]/30 mt-1">
                SELECCIONE UNA UNIDAD PARA ACTIVAR PARAMETRÍA
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600 p-2 rounded-[4px]">
            <Gauge size={20} className="text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 opacity-50">
              Fase III
            </span>
            <h3 className="text-[14px] font-black uppercase tracking-tight text-[#0f2a44]">
              Telemetría de Salida
            </h3>
          </div>
        </div>

        {/* 2. TEXTO (SUBTITULO): PARAMETRÍA DE SENSORES (HOMOLOGADO) */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50 block h-4">
            PARAMETRÍA DE SENSORES
          </label>
          <div className="bg-[#0f2a44]/5 p-4 rounded-[4px] space-y-4">
            {/* 🚀 ODOMETRY SNAPSHOT (KEEP IT) */}
            <div className="flex items-center justify-between border-b border-[#0f2a44]/10 pb-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[#0f2a44] mb-0.5">
                  Lectura de Odómetro
                </span>
                <div className="flex items-center gap-2">
                  <Gauge size={18} className="text-[#0f2a44]/40" />
                  <p className="text-2xl font-black text-[#0f2a44] tracking-tighter">
                    {startReadingDisplay}{' '}
                    <span className="text-[10px] opacity-40 font-bold ml-1">KM</span>
                  </p>
                </div>
              </div>
            </div>

            {/* ⛽ FUEL SENSOR SECTION */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets size={14} className="text-emerald-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]">
                    Nivel de Combustible:
                  </p>
                </div>
                <p className="text-xl font-black text-[#0f2a44] tracking-tighter">
                  {formData.fuelLevel}%
                </p>
              </div>

              <div className="pt-1">
                <ArchonFuelSensor
                  value={formData.fuelLevel}
                  onChange={(val: number): void => setFormData({ ...formData, fuelLevel: val })}
                  disabled={isFinished}
                />
              </div>

              {/* 📊 DYNAMIC VOLUMETRIC CHART (CIRCULAR - INTERNAL ANIMATION) */}
              {tankCapacity > 0 && (
                <div className="pt-2">
                  <FuelVolumeChart
                    currentLevel={formData.fuelLevel}
                    totalCapacity={tankCapacity}
                    color={getFuelColor(formData.fuelLevel)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderClosureSection = (): React.ReactElement => (
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
                type="number"
                placeholder="0,000"
                value={formData.endReading}
                onChange={(e): void =>
                  setFormData({ ...formData, endReading: Number(e.target.value) })
                }
                className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-amber-500 p-2.5 pl-10 text-xs font-black text-[#0f2a44] outline-none transition-colors rounded-[4px]"
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
                type="number"
                placeholder="0.00"
                value={formData.fuelLitersLoaded}
                onChange={(e): void =>
                  setFormData({ ...formData, fuelLitersLoaded: Number(e.target.value) })
                }
                className="w-full bg-white border-b-2 border-[#0f2a44]/10 focus:border-amber-500 p-2.5 pl-10 text-xs font-black text-[#0f2a44] outline-none transition-colors rounded-[4px]"
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
            onChange={(imgs): void => setFormData({ ...formData, fuelTicketImage: imgs[0] || '' })}
            title="Capturar Ticket"
            maxImages={1}
            disabled={isFinished}
          />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Body Integrado */}
      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="archon-grid-2 gap-12 items-start">
          {/* COLUMNA 1: IDENTIDAD Y MISIÓN (BLOQUE UNIFICADO) */}
          <div className="glass-card-pro p-10 space-y-12 bg-white">
            {renderIdentitySection()}
            {renderMissionSection()}
          </div>

          {/* COLUMNA 2: TELEMETRÍA Y CIERRE (BLOQUE UNIFICADO) */}
          <div className="glass-card-pro p-10 space-y-12 bg-white">
            {renderTelemetrySection()}
            {isEdit && renderClosureSection()}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-[11px] font-bold flex items-center gap-3 rounded-[4px] shadow-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Footer Integrado Soberano */}
        <div className="flex justify-between items-center gap-8 mt-12 pt-12 border-t border-slate-100">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={(): void => {
                  setAuditAction('DELETE');
                  setIsAuditModalOpen(true);
                }}
                className="px-8 py-4 bg-rose-600/10 text-rose-600 border border-rose-600/20 rounded-[4px] font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center gap-3 active:scale-95 shadow-lg"
              >
                <Trash2 size={18} className="shrink-0" /> Eliminar Registro
              </button>
            )}
          </div>
          <div className="flex gap-6">
            <button
              type="button"
              onClick={onClose}
              className="px-12 py-4 bg-[#0f2a44] text-white rounded-[4px] font-black text-[11px] uppercase tracking-widest hover:bg-sky-900 transition-all shadow-xl active:scale-95"
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
              className={`px-16 py-4 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 shadow-xl active:scale-95 rounded-[4px] border-none outline-none ${submitButtonClass} ${
                submitting ? 'opacity-50 grayscale cursor-not-allowed' : ''
              }`}
            >
              {submitting && 'Procesando...'}
              {!submitting && isFinished && (
                <>
                  Sincronizar Cambios <Save size={18} />
                </>
              )}
              {!submitting && !isFinished && (
                <>
                  {rightButtonText} <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <AuditJustificationModal
        isOpen={isAuditModalOpen}
        onClose={(): void => setIsAuditModalOpen(false)}
        onConfirm={(reason: string): Promise<void> => handleConfirmAudit(reason)}
        title={
          auditAction === 'UPDATE'
            ? `Rectificación administrativa del trayecto ${routeToEdit?.id}`
            : `Eliminación forense del registro ${routeToEdit?.id}`
        }
        actionType={auditAction}
      />
    </div>
  );
};

export default RouteAssignmentForm;

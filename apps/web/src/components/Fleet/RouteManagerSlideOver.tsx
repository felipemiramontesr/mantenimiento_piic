import React from 'react';
import {
  X,
  MapPin,
  Compass,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Gauge,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { FleetUnit } from '../../types/fleet';
import { useUsers } from '../../context/UserContext';

/**
 * 🔱 Archon Intelligence: RouteManagerSlideOver
 * Version: 1.2.6 - Identity Integration (v.28.25.0)
 * Purpose: Central command for Route Dispatch with Real-Time Personnel Sync.
 */
const RouteManagerSlideOver: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  unit: FleetUnit;
  onActionComplete: () => void;
}> = ({ isOpen, onClose, unit, onActionComplete }) => {
  const { users } = useUsers();
  const [step, setStep] = React.useState<'dispatch' | 'start' | 'end'>('dispatch');
  const [destination, setDestination] = React.useState<string>('Zacatecas');
  const [otherDestination, setOtherDestination] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [odometer1, setOdometer1] = React.useState<string>('');
  const [odometer2, setOdometer2] = React.useState<string>('');
  const [operatorId, setOperatorId] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // 🔱 Identity Filter: Hide Archon & Inactive Personnel
  const validOperators = React.useMemo(
    () =>
      users.filter(
        (u) =>
          u.username.toLowerCase() !== 'archon' &&
          u.role.name.toLowerCase() !== 'archon' &&
          u.is_active
      ),
    [users]
  );

  // 🔱 Mirror Logic: Match verification
  const isOdometerValid: boolean = odometer1 !== '' && odometer1 === odometer2;

  React.useEffect((): void => {
    if (isOpen && unit) {
      if (unit.status === 'Disponible') setStep('dispatch');
      else if (unit.status === 'Asignada') setStep('start');
      else if (unit.status === 'En Ruta') setStep('end');
    }
  }, [unit, isOpen]);

  const handleAction = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      let endpoint = '';
      let payload: {
        unitId: string;
        operatorId?: number;
        destination?: string;
        description?: string;
        startKm?: number;
        endKm?: number;
      } = { unitId: unit.id };

      if (step === 'dispatch') {
        endpoint = '/v1/fleet/routes/dispatch';
        payload = {
          ...payload,
          operatorId: Number(operatorId),
          destination: destination === 'Otro' ? otherDestination : destination,
          description,
        };
      } else if (step === 'start') {
        endpoint = '/v1/fleet/routes/start';
        payload = { ...payload, startKm: Number(odometer1) };
      } else if (step === 'end') {
        endpoint = '/v1/fleet/routes/end';
        payload = { ...payload, endKm: Number(odometer1) };
      }

      const response = await fetch(
        `${process.env.VITE_API_URL || 'http://localhost:3001'}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('archon_token')}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Acción fallida');

      onActionComplete();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falla de conexión';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getOdometerClass = (): string => {
    if (odometer2 === '') return 'bg-gray-50 border-gray-100';
    return isOdometerValid
      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
      : 'bg-red-50 border-red-500 text-red-700';
  };

  if (!isOpen || !unit) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
      <div
        className="absolute inset-0 bg-[#0f2a44]/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        <div className="p-6 bg-[#0f2a44] text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded bg-[#f2b705] flex items-center justify-center text-[#0f2a44] shadow-lg">
              <Compass size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest">
                Control de Trayectoria
              </h2>
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">
                Unidad: {unit.id} • {unit.marca} {unit.modelo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-center gap-3 text-red-700">
              <AlertTriangle size={18} />
              <span className="text-xs font-bold uppercase">{error}</span>
            </div>
          )}

          <div className="flex items-center gap-4 py-4 border-b border-gray-100">
            <div
              className={`text-[10px] font-black px-3 py-1 rounded-full ${
                step === 'dispatch' ? 'bg-[#0f2a44] text-white' : 'bg-gray-100 opacity-40'
              }`}
            >
              1. ASIGNACIÓN
            </div>
            <ArrowRight size={12} className="opacity-20" />
            <div
              className={`text-[10px] font-black px-3 py-1 rounded-full ${
                step === 'start' ? 'bg-[#0f2a44] text-white' : 'bg-gray-100 opacity-40'
              }`}
            >
              2. INICIO
            </div>
            <ArrowRight size={12} className="opacity-20" />
            <div
              className={`text-[10px] font-black px-3 py-1 rounded-full ${
                step === 'end' ? 'bg-[#0f2a44] text-white' : 'bg-gray-100 opacity-40'
              }`}
            >
              3. FINALIZACIÓN
            </div>
          </div>

          {step === 'dispatch' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase text-[#0f2a44]/50 flex items-center gap-2">
                  <User size={12} /> Operador Asignado
                </label>
                <select
                  value={operatorId}
                  onChange={(e): void => setOperatorId(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded text-sm font-bold focus:border-[#0f2a44] outline-none"
                >
                  <option value="">-- Seleccionar Operador --</option>
                  {validOperators.map(
                    (op): React.ReactElement => (
                      <option key={op.id} value={op.id}>
                        {op.fullName ? op.fullName.toUpperCase() : op.username.toUpperCase()}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase text-[#0f2a44]/50 flex items-center gap-2">
                  <MapPin size={12} /> Destino del Trayecto
                </label>
                <select
                  value={destination}
                  onChange={(e): void => setDestination(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded text-sm font-bold focus:border-[#0f2a44] outline-none"
                >
                  <option value="Zacatecas">ZACATECAS (CENTRO)</option>
                  <option value="Guadalupe">GUADALUPE (BASE)</option>
                  <option value="Otro">OTRO DESTINO (MANUAL)</option>
                </select>
                {destination === 'Otro' && (
                  <input
                    type="text"
                    value={otherDestination}
                    onChange={(e): void => setOtherDestination(e.target.value)}
                    placeholder="Especifique destino..."
                    className="w-full p-4 bg-white border-2 border-[#f2b705] rounded text-sm font-bold outline-none"
                  />
                )}
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase text-[#0f2a44]/50 flex items-center gap-2">
                  <FileText size={12} /> Propósito de la Misión (Briefing)
                </label>
                <textarea
                  value={description}
                  onChange={(e): void => setDescription(e.target.value)}
                  placeholder="Describa el objetivo del traslado..."
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded text-sm font-bold h-32 focus:border-[#0f2a44] outline-none"
                />
              </div>
            </div>
          )}

          {(step === 'start' || step === 'end') && (
            <div className="space-y-8">
              <div className="p-6 bg-amber-50 rounded border border-amber-100 space-y-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <ClipboardList size={14} />
                  <span className="text-[10px] font-black uppercase">Briefing de Misión</span>
                </div>
                <p className="text-sm font-bold text-amber-900 leading-relaxed italic">
                  &quot;{unit.routeDescription || 'Sin descripción de misión proporcionada.'}&quot;
                </p>
                <div className="pt-2 flex items-center gap-2 opacity-60">
                  <MapPin size={12} />
                  <span className="text-[10px] font-black uppercase">
                    Destino: {unit.routeDestination || '---'}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase text-[#0f2a44] border-l-4 border-[#0f2a44] pl-3">
                  {step === 'start' ? 'Validación de Salida' : 'Validación de Retorno'}
                </h3>
                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase opacity-40">
                    Lectura de Odómetro
                  </label>
                  <div className="relative">
                    <Gauge
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="number"
                      value={odometer1}
                      onChange={(e): void => setOdometer1(e.target.value)}
                      placeholder="Ingrese Kilometraje"
                      className="w-full p-6 pl-14 bg-gray-50 border-2 border-gray-100 rounded-lg text-xl font-black outline-none focus:border-[#0f2a44] transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase opacity-40 italic">
                    Confirmar Lectura (Double-Check)
                  </label>
                  <div className="relative">
                    <Gauge
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="number"
                      value={odometer2}
                      onChange={(e): void => setOdometer2(e.target.value)}
                      placeholder="Re-ingrese Kilometraje"
                      className={`w-full p-6 pl-14 border-2 rounded-lg text-xl font-black outline-none transition-all ${getOdometerClass()}`}
                    />
                  </div>
                  {odometer2 !== '' && !isOdometerValid && (
                    <span className="text-[10px] font-black text-red-600 uppercase flex items-center gap-1">
                      <AlertTriangle size={12} /> Las lecturas no coinciden
                    </span>
                  )}
                  {isOdometerValid && (
                    <span className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1">
                      <CheckCircle2 size={12} /> Validación Correcta
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-gray-100">
          <button
            disabled={
              isLoading ||
              (step === 'dispatch' &&
                (!operatorId || !description || (destination === 'Otro' && !otherDestination))) ||
              ((step === 'start' || step === 'end') && !isOdometerValid)
            }
            onClick={(): Promise<void> => handleAction()}
            className={`w-full p-6 rounded-lg font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
              isLoading
                ? 'bg-gray-300 opacity-50'
                : 'bg-[#0f2a44] text-white hover:bg-[#071626] shadow-xl'
            } disabled:opacity-20 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              'Procesando...'
            ) : (
              <>
                {step === 'dispatch' && 'Confirmar Despacho'}
                {step === 'start' && 'Iniciar Trayectoria'}
                {step === 'end' && 'Concluir Trayectoria'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteManagerSlideOver;

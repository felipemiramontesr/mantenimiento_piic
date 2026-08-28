import React, { useState } from 'react';

/** Encabezado del formulario de inicio de orden UPA (FC163 F2B5). */
function InitFormHeader(): React.JSX.Element {
  return (
    <div>
      <h2 className="text-[#0f2a44] font-black text-2xl tracking-tight uppercase">
        Nueva Orden UPA
      </h2>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0f2a44]/50 mt-1">
        Proceso Universal Archon — Iniciar Pipeline
      </p>
    </div>
  );
}

interface InitFormProps {
  onSubmit: (vehicleId: string) => void;
  loading: boolean;
  error: string | null;
}

/** Formulario de inicio de una nueva orden UPA (FC163 F2B4 Sub-Batch 4B-2). */
const InitForm: React.FC<InitFormProps> = ({ onSubmit, loading, error }) => {
  const [vehicleId, setVehicleId] = useState('');

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (vehicleId.trim()) onSubmit(vehicleId.trim());
  };

  return (
    <div className="animate-in fade-in duration-700 flex items-center justify-center min-h-[55vh]">
      <div className="w-full max-w-md space-y-6">
        <InitFormHeader />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="vehicle-id-input"
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f2a44]/60"
            >
              ID de Unidad
            </label>
            <input
              id="vehicle-id-input"
              type="text"
              value={vehicleId}
              onChange={(e): void => setVehicleId(e.target.value)}
              placeholder="Ej: ASM-001"
              required
              data-testid="vehicle-id-input"
              className="w-full px-4 py-3 font-bold text-[#0f2a44] border border-slate-200 rounded-[4px] bg-white focus:outline-none focus:border-[#10b981]/50 text-sm"
            />
          </div>

          {error && (
            <p data-testid="init-error" className="text-red-600 text-sm font-bold">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !vehicleId.trim()}
            data-testid="init-submit-btn"
            className="w-full py-4 font-black text-sm uppercase tracking-widest text-[#0f2a44] bg-[#f2b705] rounded-[4px] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? 'Iniciando...' : 'Iniciar Proceso UPA'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InitForm;

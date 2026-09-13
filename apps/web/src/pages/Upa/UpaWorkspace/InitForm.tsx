import React, { useState } from 'react';
import { ClipboardList, Truck } from 'lucide-react';
import ArchonField from '../../../components/ArchonField';

/** Encabezado del formulario de inicio de orden UPA (FC163 F2B5). */
function InitFormHeader(): React.JSX.Element {
  return (
    <div className="card-sovereign-header">
      <ClipboardList size={22} className="text-[var(--card-accent)]" />
      <h3 className="card-sovereign-title text-archon-xl opacity-100">Nueva Orden UPA</h3>
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
      <div className="card-archon-sovereign bg-white p-10 w-full max-w-md space-y-6 [--card-accent:#0f2a44]">
        <InitFormHeader />

        <form onSubmit={handleSubmit} className="space-y-4">
          <ArchonField label="ID de Unidad" icon={Truck} required>
            <input
              id="vehicle-id-input"
              type="text"
              value={vehicleId}
              onChange={(e): void => setVehicleId(e.target.value)}
              placeholder="Ej: ASM-001"
              required
              data-testid="vehicle-id-input"
              className="archon-input"
            />
          </ArchonField>

          {error && (
            <p data-testid="init-error" className="text-red-600 text-sm font-bold">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !vehicleId.trim()}
            data-testid="init-submit-btn"
            className="btn-sentinel-amber-static w-full"
          >
            {loading ? 'Iniciando...' : 'Iniciar Proceso UPA'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InitForm;

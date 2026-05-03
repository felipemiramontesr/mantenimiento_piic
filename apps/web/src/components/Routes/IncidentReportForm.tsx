import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Camera, MessageSquare, ShieldAlert, ChevronRight, X } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { IncidentCategory, IncidentSeverity } from '../../types/route';
import ArchonImageUploader from '../ArchonImageUploader';

interface IncidentReportFormProps {
  routeUuid: string;
  unitId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 🔱 ARCHON INCIDENT REPORT FORM
 * Architecture: Sovereign Emergency Protocol (Sentinel)
 * Purpose: High-fidelity capture of unforeseen events in transit.
 */
const IncidentReportForm: React.FC<IncidentReportFormProps> = ({
  routeUuid,
  unitId,
  onClose,
  onSuccess,
}) => {
  const { reportIncident } = useFleet();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: 'MECANICA' as IncidentCategory,
    severity: 'MEDIUM' as IncidentSeverity,
    description: '',
    evidenceImage: '',
  });

  const categories: { value: IncidentCategory; label: string; icon: React.ElementType }[] = [
    { value: 'MECANICA', label: 'Falla Mecánica', icon: AlertTriangle },
    { value: 'SINIESTRO', label: 'Siniestro / Accidente', icon: ShieldAlert },
    { value: 'LEGAL', label: 'Multa / Tránsito', icon: MessageSquare },
    { value: 'OPERATIVA', label: 'Retraso / Clima', icon: Camera },
    { value: 'OTRA', label: 'Otro Evento', icon: AlertTriangle },
  ];

  const severities: { value: IncidentSeverity; label: string; color: string }[] = [
    { value: 'LOW', label: 'Baja', color: 'bg-blue-500' },
    { value: 'MEDIUM', label: 'Media', color: 'bg-amber-500' },
    { value: 'HIGH', label: 'Alta', color: 'bg-orange-600' },
    { value: 'CRITICAL', label: 'Crítica', color: 'bg-rose-700' },
  ];

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!formData.description) return;

    setSubmitting(true);
    setError(null);

    try {
      await reportIncident(routeUuid, {
        category: formData.category,
        description: formData.description,
        severity: formData.severity,
        evidenceImage: formData.evidenceImage || undefined,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reportar la incidencia';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[4px] shadow-2xl border border-rose-100 overflow-hidden w-full max-w-md mx-auto"
    >
      {/* Emergency Header */}
      <header className="bg-rose-700 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert size={20} className="animate-pulse" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-tighter">
              Protocolo Sentinel: Alerta de Incidencia
            </h2>
            <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">
              Unidad: {unitId} • Reporte en Tránsito
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Category Grid */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
            Categoría del Incidente
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={(): void => setFormData({ ...formData, category: cat.value })}
                className={`
                  flex items-center gap-2 p-3 rounded-[4px] border transition-all text-left
                  ${
                    formData.category === cat.value
                      ? 'border-rose-600 bg-rose-50 text-rose-900 shadow-sm'
                      : 'border-gray-100 bg-gray-50 text-[#0f2a44]/60 hover:border-rose-200'
                  }
                `}
              >
                <cat.icon
                  size={14}
                  className={formData.category === cat.value ? 'text-rose-600' : ''}
                />
                <span className="text-[10px] font-black uppercase tracking-tighter">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Severity Selector */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
            Severidad Operativa
          </label>
          <div className="flex gap-2">
            {severities.map((sev) => (
              <button
                key={sev.value}
                type="button"
                onClick={(): void => setFormData({ ...formData, severity: sev.value })}
                className={`
                  flex-1 py-2 rounded-[4px] text-[9px] font-black uppercase tracking-widest transition-all
                  ${
                    formData.severity === sev.value
                      ? `${sev.color} text-white shadow-lg scale-105`
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }
                `}
              >
                {sev.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description Field */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
            Descripción Detallada
          </label>
          <div className="relative">
            <MessageSquare size={14} className="absolute left-3 top-3 text-[#0f2a44]/30" />
            <textarea
              required
              rows={3}
              placeholder="Describa el evento, ubicación y estado de la unidad..."
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full bg-gray-50 border-2 border-gray-100 focus:border-rose-500 p-3 pl-10 text-xs font-bold text-[#0f2a44] outline-none transition-colors resize-none rounded-[4px]"
            />
          </div>
        </div>

        {/* Evidence Uploader */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44] opacity-50">
            Evidencia Fotográfica
          </label>
          <ArchonImageUploader
            images={formData.evidenceImage ? [formData.evidenceImage] : []}
            onChange={(imgs: string[]): void =>
              setFormData({ ...formData, evidenceImage: imgs[0] || '' })
            }
            title="Capturar Evidencia"
            maxImages={1}
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-800 text-[10px] font-bold border-l-4 border-rose-600 flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !formData.description}
            className="w-full py-4 bg-rose-700 hover:bg-rose-800 text-white text-[10px] font-black uppercase tracking-widest rounded-[4px] shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {submitting ? 'Emitiendo Alerta...' : 'Emitir Alerta Sentinel'}
            <ChevronRight size={14} />
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default IncidentReportForm;

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  X,
  Zap,
  Info,
} from 'lucide-react';
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
 * 🔱 ARCHON INCIDENT REPORT FORM (v.76.5.0 - Sentinel Console)
 * Architecture: Sovereign Emergency Protocol (Full-Width Command Center)
 * UI/UX: High-fidelity grid layout optimized for industrial mission control.
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

  const categories: {
    value: IncidentCategory;
    label: string;
    icon: React.ElementType;
    color: string;
  }[] = [
    { value: 'MECANICA', label: 'Falla Mecánica', icon: AlertTriangle, color: 'text-amber-500' },
    {
      value: 'SINIESTRO',
      label: 'Siniestro / Accidente',
      icon: ShieldAlert,
      color: 'text-rose-600',
    },
    { value: 'LEGAL', label: 'Multa / Tránsito', icon: Info, color: 'text-blue-500' },
    { value: 'OPERATIVA', label: 'Retraso / Clima', icon: Zap, color: 'text-emerald-500' },
    { value: 'OTRA', label: 'Otro Evento', icon: MessageSquare, color: 'text-slate-400' },
  ];

  const severities: { value: IncidentSeverity; label: string; color: string; bg: string }[] = [
    { value: 'LOW', label: 'BAJA', color: 'text-blue-600', bg: 'bg-blue-50' },
    { value: 'MEDIUM', label: 'MEDIA', color: 'text-amber-600', bg: 'bg-amber-50' },
    { value: 'HIGH', label: 'ALTA', color: 'text-orange-600', bg: 'bg-orange-50' },
    { value: 'CRITICAL', label: 'CRÍTICA', color: 'text-rose-600', bg: 'bg-rose-50' },
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[4px] shadow-2xl border border-rose-100 overflow-hidden w-full"
    >
      {/* 🛡️ Sentinel Command Header */}
      <header className="bg-rose-700 px-6 py-4 text-white flex items-center justify-between relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-rose-800 to-transparent opacity-50" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-10 h-10 bg-white/10 rounded-[4px] flex items-center justify-center border border-white/20">
            <ShieldAlert size={24} className="text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] leading-none mb-1">
              Protocolo Sentinel: Alerta de Incidencia
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-rose-200 uppercase tracking-widest">
                UNIDAD: {unitId}
              </span>
              <div className="w-1 h-1 bg-rose-400 rounded-full" />
              <span className="text-[10px] font-bold text-rose-200 uppercase tracking-widest">
                REPORTE FORENSE EN TIEMPO REAL
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors relative z-10"
        >
          <X size={20} className="text-white/70" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Classification */}
          <div className="lg:col-span-4 space-y-8">
            {/* Category Selection */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40">
                Clasificación del Evento
              </label>
              <div className="grid grid-cols-1 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={(): void => setFormData({ ...formData, category: cat.value })}
                    className={`
                      flex items-center justify-between p-3.5 rounded-[4px] border transition-all text-left group
                      ${
                        formData.category === cat.value
                          ? 'border-rose-600 bg-rose-50/50 shadow-sm'
                          : 'border-gray-100 bg-gray-50/50 text-[#0f2a44]/60 hover:border-rose-200'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <cat.icon
                        size={16}
                        className={
                          formData.category === cat.value ? 'text-rose-600' : 'text-slate-400'
                        }
                      />
                      <span
                        className={`text-[11px] font-black uppercase tracking-tight ${
                          formData.category === cat.value ? 'text-rose-900' : ''
                        }`}
                      >
                        {cat.label}
                      </span>
                    </div>
                    {formData.category === cat.value && (
                      <ChevronRight size={14} className="text-rose-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Selection */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40">
                Grado de Severidad Operativa
              </label>
              <div className="grid grid-cols-2 gap-2">
                {severities.map((sev) => (
                  <button
                    key={sev.value}
                    type="button"
                    onClick={(): void => setFormData({ ...formData, severity: sev.value })}
                    className={`
                      py-3 rounded-[4px] border transition-all text-center
                      ${
                        formData.severity === sev.value
                          ? `border-${sev.color.split('-')[1]}-600 ${sev.bg} ${
                              sev.color
                            } shadow-sm font-black`
                          : 'border-gray-100 bg-gray-50/50 text-gray-400 text-[10px] font-bold'
                      }
                    `}
                  >
                    <span className="text-[10px] uppercase tracking-widest">{sev.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Evidence & Description */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Detailed Description */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40">
                  Relato de los Hechos
                </label>
                <div className="relative">
                  <MessageSquare size={16} className="absolute left-4 top-4 text-[#0f2a44]/20" />
                  <textarea
                    required
                    rows={8}
                    placeholder="Describa el evento, ubicación exacta y estado actual de la unidad y operador..."
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full bg-gray-50 border-2 border-gray-100 focus:border-rose-500 p-4 pl-12 text-sm font-bold text-[#0f2a44] outline-none transition-colors resize-none rounded-[4px] h-[200px]"
                  />
                </div>
              </div>

              {/* Photo Evidence */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f2a44] opacity-40">
                  Evidencia Visual (Mandatorio)
                </label>
                <div className="h-[200px]">
                  <ArchonImageUploader
                    images={formData.evidenceImage ? [formData.evidenceImage] : []}
                    onChange={(imgs: string[]): void =>
                      setFormData({ ...formData, evidenceImage: imgs[0] || '' })
                    }
                    title="Capturar Escena"
                    maxImages={1}
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-rose-50 text-rose-800 text-xs font-bold border-l-4 border-rose-600 flex items-center gap-3 rounded-r-[4px]"
              >
                <AlertTriangle size={18} /> {error}
              </motion.div>
            )}

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[#0f2a44]/50 hover:text-rose-600 transition-colors"
              >
                Abortar Reporte
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.description}
                className={`
                  flex items-center gap-3 px-8 py-4 rounded-[4px] text-[11px] font-black uppercase tracking-[0.2em] transition-all
                  ${
                    submitting || !formData.description
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-rose-600 text-white shadow-xl shadow-rose-600/20 hover:bg-rose-700 hover:-translate-y-0.5'
                  }
                `}
              >
                {submitting ? 'Transmitiendo Alerta...' : 'Emitir Alerta Sentinel'}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
};

export default IncidentReportForm;

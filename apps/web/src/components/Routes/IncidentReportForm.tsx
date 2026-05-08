import React, { useState, useEffect, useRef } from 'react';
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
  const formRef = useRef<HTMLDivElement>(null);
  const { reportIncident } = useFleet();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔱 Auto-Scroll Protocol (v.76.6.0)
  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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
      ref={formRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[4px] border border-rose-100 overflow-hidden w-full"
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

      <form onSubmit={handleSubmit} className="p-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 🔱 COLUMNA ALFA: Clasificación Forense */}
          <div className="space-y-10">
            {/* Category Selection */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0f2a44] opacity-40">
                Clasificación del Evento
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={(): void => setFormData({ ...formData, category: cat.value })}
                    className={`
                      flex items-center justify-between p-4 rounded-[4px] border transition-all text-left group
                      ${
                        formData.category === cat.value
                          ? 'border-rose-600 bg-rose-50/50 shadow-sm'
                          : 'border-[#0f2a44]/5 bg-[#0f2a44]/2 text-[#0f2a44]/60 hover:border-rose-200'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <cat.icon
                        size={16}
                        className={
                          formData.category === cat.value ? 'text-rose-600' : 'text-[#0f2a44]/40'
                        }
                      />
                      <span
                        className={`text-[11px] font-black uppercase tracking-widest ${
                          formData.category === cat.value ? 'text-[#0f2a44]' : ''
                        }`}
                      >
                        {cat.label}
                      </span>
                    </div>
                    {formData.category === cat.value && (
                      <div className="w-1.5 h-1.5 bg-rose-600 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Selection */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0f2a44] opacity-40">
                Grado de Severidad Operativa
              </label>
              <div className="grid grid-cols-2 gap-3">
                {severities.map((sev) => (
                  <button
                    key={sev.value}
                    type="button"
                    onClick={(): void => setFormData({ ...formData, severity: sev.value })}
                    className={`
                      py-4 rounded-[4px] border transition-all text-center
                      ${
                        formData.severity === sev.value
                          ? `border-[#0f2a44] ${sev.bg} text-[#0f2a44] shadow-sm font-black`
                          : 'border-[#0f2a44]/5 bg-[#0f2a44]/2 text-[#0f2a44]/30 text-[10px] font-black'
                      }
                    `}
                  >
                    <span className="text-[10px] uppercase tracking-[0.2em]">{sev.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 🔱 COLUMNA BETA: Evidencia y Relato */}
          <div className="space-y-10 flex flex-col h-full">
            {/* Detailed Description */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0f2a44] opacity-40">
                Relato de los Hechos
              </label>
              <div className="relative">
                <MessageSquare size={16} className="absolute left-4 top-4 text-[#0f2a44]/20" />
                <textarea
                  required
                  rows={6}
                  placeholder="Describa el evento, ubicación y estado de la unidad..."
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full bg-[#0f2a44]/2 border-2 border-[#0f2a44]/5 focus:border-rose-500 p-4 pl-12 text-xs font-bold text-[#0f2a44] outline-none transition-colors resize-none rounded-[4px] h-[160px]"
                />
              </div>
            </div>

            {/* Photo Evidence */}
            <div className="space-y-4 flex-grow">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0f2a44] opacity-40">
                Evidencia Visual (Mandatorio)
              </label>
              <div className="h-[210px]">
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

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-rose-50 text-rose-800 text-[10px] font-black border-l-4 border-rose-600 flex items-center gap-3 rounded-r-[4px]"
              >
                <AlertTriangle size={18} /> {error}
              </motion.div>
            )}

            {/* Sovereign Submit Actions */}
            <div className="flex items-center justify-end gap-6 pt-8 mt-auto">
              <button
                type="button"
                onClick={onClose}
                className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0f2a44]/40 hover:text-rose-600 transition-colors border-b-2 border-transparent hover:border-rose-600 pb-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.description}
                className={`
                  flex items-center gap-4 px-10 py-5 rounded-[4px] text-[10px] font-black uppercase tracking-[0.3em] transition-all relative overflow-hidden group
                  ${
                    submitting || !formData.description
                      ? 'bg-[#0f2a44]/5 text-[#0f2a44]/20 cursor-not-allowed'
                      : 'bg-[#0f2a44] text-white shadow-2xl shadow-[#0f2a44]/20 hover:-translate-y-1'
                  }
                `}
              >
                <span className="relative z-10">
                  {submitting ? 'Transmitiendo...' : 'Emitir Alerta Sentinel'}
                </span>
                <ChevronRight
                  size={16}
                  className="relative z-10 group-hover:translate-x-1 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
};

export default IncidentReportForm;

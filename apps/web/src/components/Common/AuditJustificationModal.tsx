import React, { useState } from 'react';

interface AuditJustificationModalProps {
  isOpen: boolean;
  onClose(): void;
  onConfirm(reason: string): void;
  title: string;
  actionType: 'UPDATE' | 'DELETE';
  loading?: boolean;
}

/**
 * 🔱 ARCHON AUDIT JUSTIFICATION MODAL
 * Standardizes the mandatory "Impact Justification" for all destructive actions.
 */
const AuditJustificationModal: React.FC<AuditJustificationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  actionType,
  loading,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const isDelete = actionType === 'DELETE';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#0A0F1E] border border-white/10 rounded-xl w-full max-w-3xl min-h-[500px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col justify-between">
        <div className="p-8 flex flex-col justify-between flex-1">
          <div>
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className={isDelete ? 'text-red-500' : 'text-blue-500'}>
                {isDelete ? '🚨 Confirmar Eliminación' : '📝 Justificar Cambio'}
              </span>
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              {title}
              <br />
              <span className="text-xs italic text-gray-500 block mt-1.5">
                * Esta acción quedará registrada permanentemente en la Bóveda de Auditoría.
              </span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Motivo del Cambio / Justificación
                </label>
                <textarea
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors min-h-[220px] resize-none"
                  placeholder="Ej: Corrección de error en kilometraje inicial..."
                  value={reason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                    setReason(e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-sentinel-red text-sm disabled:opacity-50 w-full py-2.5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={(): void => onConfirm(reason)}
              disabled={reason.length < 5 || loading}
              className={`${
                isDelete ? 'btn-sentinel-red' : 'btn-sentinel-emerald'
              } text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full py-2.5`}
            >
              {loading && (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {isDelete ? 'Confirmar Baja' : 'Sincronizar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditJustificationModal;

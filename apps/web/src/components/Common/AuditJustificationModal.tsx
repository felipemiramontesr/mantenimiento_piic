import React, { useState } from 'react';

interface AuditJustificationModalProps {
  isOpen: boolean;
  onClose(): void;
  onConfirm(reason: string): void;
  title: string;
  actionType: 'UPDATE' | 'DELETE';
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
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const isDelete = actionType === 'DELETE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0A0F1E] border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span className={isDelete ? 'text-red-500' : 'text-blue-500'}>
              {isDelete ? '🚨 Confirmar Eliminación' : '📝 Justificar Cambio'}
            </span>
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            {title}
            <br />
            <span className="text-xs italic text-gray-500">
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
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors min-h-[100px] resize-none"
                placeholder="Ej: Corrección de error en kilometraje inicial..."
                value={reason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                  setReason(e.target.value)
                }
              />
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-white text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={(): void => onConfirm(reason)}
              disabled={reason.length < 5}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                isDelete
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isDelete ? 'Eliminar Registro' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditJustificationModal;

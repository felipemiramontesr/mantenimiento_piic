import React, { useState } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { RouteLog } from './RouteLogTable';
import api from '../../api/client';
import AuditJustificationModal from '../Common/AuditJustificationModal';

interface RouteEditModalProps {
  log: RouteLog;
   onClose: (): void => void;
   onSuccess: (): void => void;
}

/**
 * 🔱 ARCHON ROUTE EDIT MODAL
 * Administrative tool for forensic data correction.
 */
 const RouteEditModal: React.FC<RouteEditModalProps> = ({ log, onClose, onSuccess }): React.JSX.Element => {
  const [formData, setFormData] = useState({
    destination: log.destination,
    start_km: log.start_km,
    end_km: log.end_km || 0,
  });

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditAction, setAuditAction] = useState<'UPDATE' | 'DELETE'>('UPDATE');
  const [isLoading, setIsLoading] = useState(false);

   const handleSaveClick = (): void => {
    setAuditAction('UPDATE');
    setIsAuditModalOpen(true);
  };

   const handleDeleteClick = (): void => {
    setAuditAction('DELETE');
    setIsAuditModalOpen(true);
  };

   const handleConfirmAudit = async (reason: string): Promise<void> => {
    setIsLoading(true);
    try {
      if (auditAction === 'UPDATE') {
        await api.put(`/routes/${log.uuid}`, {
          data: formData,
          reason,
        });
      } else {
        await api.delete(`/routes/${log.uuid}`, {
          data: { reason }, // Fastify delete body might need careful handling depending on config
        });
      }
      onSuccess();
      onClose();
     } catch (err) {
       // Audit failure logic
     } finally {
      setIsLoading(false);
      setIsAuditModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-[#0f2a44] p-4 flex justify-between items-center">
          <div>
            <h2 className="text-white font-black text-lg tracking-tighter">EDITAR MISIÓN LOGÍSTICA</h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Protocolo de Rectificación Administrativa</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-[#0f2a44]/40 uppercase mb-1">Destino</label>
              <input
                type="text"
                className="w-full bg-gray-50 border border-gray-100 rounded-lg p-3 text-[#0f2a44] font-bold text-sm focus:outline-none focus:border-blue-500"
                value={formData.destination}
                 onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({ ...formData, destination: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-[#0f2a44]/40 uppercase mb-1">KM Inicial</label>
              <input
                type="number"
                className="w-full bg-gray-50 border border-gray-100 rounded-lg p-3 text-[#0f2a44] font-bold text-sm focus:outline-none focus:border-blue-500"
                value={formData.start_km}
                 onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({ ...formData, start_km: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-[#0f2a44]/40 uppercase mb-1">KM Final</label>
              <input
                type="number"
                className="w-full bg-gray-50 border border-gray-100 rounded-lg p-3 text-[#0f2a44] font-bold text-sm focus:outline-none focus:border-blue-500"
                value={formData.end_km}
                 onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFormData({ ...formData, end_km: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
            <div className="flex gap-3">
              <button
                onClick={handleSaveClick}
                disabled={isLoading}
                className="flex-1 bg-[#0f2a44] text-white py-3 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-[#1a3a5a] transition-all flex items-center justify-center gap-2"
              >
                <Save size={14} />
                Guardar Cambios
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={isLoading}
                className="px-4 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                title="Eliminar Registro"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <p className="text-[9px] text-gray-400 text-center italic">
              * Cualquier cambio requiere una justificación que será auditada.
            </p>
          </div>
        </div>
      </div>

      <AuditJustificationModal
        isOpen={isAuditModalOpen}
         onClose={(): void => setIsAuditModalOpen(false)}
         onConfirm={(reason: string): Promise<void> => handleConfirmAudit(reason)}
        title={auditAction === 'UPDATE' ? 'Actualización de datos de ruta' : 'Eliminación permanente de registro logístico'}
        actionType={auditAction}
      />
    </div>
  );
};

export default RouteEditModal;

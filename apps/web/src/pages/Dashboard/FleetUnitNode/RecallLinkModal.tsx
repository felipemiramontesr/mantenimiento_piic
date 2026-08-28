import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import ArchonModal from '../../../components/UI/ArchonModal';

type RecallLinkModalProps = {
  isOpen: boolean;
  onClose(): void;
  onConfirm(recallId: number): Promise<void>;
};

function RecallLinkModalFooter({
  recallId,
  submitting,
  onCancel,
  onSubmit,
}: {
  recallId: string;
  submitting: boolean;
  onCancel(): void;
  onSubmit(): void;
}): React.JSX.Element {
  return (
    <div className="flex gap-3 justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors rounded-[4px] text-archon-sm font-black uppercase tracking-widest"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !recallId || Number.parseInt(recallId, 10) <= 0}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 transition-colors rounded-[4px] text-white text-archon-sm font-black uppercase tracking-widest"
      >
        Vincular
      </button>
    </div>
  );
}

/** Modal to manually link a catalog recall to a fleet unit by ID. */
export function RecallLinkModal({
  isOpen,
  onClose,
  onConfirm,
}: RecallLinkModalProps): React.JSX.Element | null {
  const [recallId, setRecallId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    const id = Number.parseInt(recallId, 10);
    if (!id || id <= 0) return;
    setSubmitting(true);
    try {
      await onConfirm(id);
      setRecallId('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ArchonModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" ariaLabel="Vincular recall">
      <div className="p-8 flex flex-col gap-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell size={18} className="text-amber-400" />
          Vincular Recall al Catálogo
        </h3>
        <p className="text-gray-400 text-sm">
          Ingresa el ID del recall del catálogo oficial para vincularlo a esta unidad.
        </p>
        <input
          type="number"
          min={1}
          placeholder="ID del recall (ej. 42)"
          value={recallId}
          onChange={(e): void => setRecallId(e.target.value)}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-[4px] text-white focus:outline-none focus:border-amber-400/50"
          aria-label="ID del recall"
        />
        <RecallLinkModalFooter
          recallId={recallId}
          submitting={submitting}
          onCancel={onClose}
          onSubmit={handleSubmit}
        />
      </div>
    </ArchonModal>
  );
}

export default RecallLinkModal;

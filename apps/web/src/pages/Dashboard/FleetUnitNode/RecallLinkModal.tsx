import React, { useState } from 'react';
import { Bell, Hash } from 'lucide-react';
import ArchonModal from '../../../components/UI/ArchonModal';
import ArchonField from '../../../components/ArchonField';

type RecallLinkModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (recallId: number) => Promise<void>;
};

function RecallLinkModalFooter({
  recallId,
  submitting,
  onCancel,
  onSubmit,
}: {
  readonly recallId: string;
  readonly submitting: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: () => void;
}): React.JSX.Element {
  return (
    <div className="flex gap-3 justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="inline-flex items-center justify-center h-11 px-4 text-xs font-black uppercase tracking-widest text-[#0f2a44]/50 hover:text-[#0f2a44]"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !recallId || Number.parseInt(recallId, 10) <= 0}
        className="btn-sentinel-amber-static text-xs"
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
    // FC165 F3 Slice3.1 — purga: el botón que invoca este handler ya
    // deshabilita con la misma condición (`!recallId || parseInt(...)<=0`),
    // así que este guard interno era redundante e inalcanzable (censo vivo:
    // 0 hits tras la suite completa).
    const id = Number.parseInt(recallId, 10);
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
        <h3 className="text-xl font-bold text-[#0f2a44] flex items-center gap-2">
          <Bell size={18} className="text-amber-600" />
          Vincular Recall al Catálogo
        </h3>
        <p className="text-[#0f2a44]/60 text-sm">
          Ingresa el ID del recall del catálogo oficial para vincularlo a esta unidad.
        </p>
        <ArchonField label="ID del recall" icon={Hash}>
          <input
            type="number"
            min={1}
            placeholder="ID del recall (ej. 42)"
            value={recallId}
            onChange={(e): void => setRecallId(e.target.value)}
            className="archon-input"
            aria-label="ID del recall"
          />
        </ArchonField>
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

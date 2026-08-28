import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface EvidenceUrlRowProps {
  url: string;
  idx: number;
  onUpdate: (idx: number, val: string) => void;
  onRemove: (idx: number) => void;
}

/** Fila de una URL de evidencia con botón de eliminar (FC163 F2B4 Sub-Batch 4B-2). */
function EvidenceUrlRow({ url, idx, onUpdate, onRemove }: EvidenceUrlRowProps): React.ReactElement {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="https://..."
        value={url}
        onChange={(e): void => onUpdate(idx, e.target.value)}
        data-testid={`evidence-url-input-${idx}`}
        className="flex-1 px-3 py-2 text-sm font-medium text-[#0f2a44] border border-slate-200 rounded-[4px] bg-white focus:outline-none focus:border-[#10b981]/50"
      />
      <button
        type="button"
        onClick={(): void => onRemove(idx)}
        className="p-2 text-red-400 hover:text-red-600 transition-colors"
        aria-label="Eliminar URL"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

interface EvidenceInputProps {
  urls: string[];
  notes: string;
  onUrlsChange: (urls: string[]) => void;
  onNotesChange: (notes: string) => void;
}

/** Captura de URLs de evidencia + notas para el cierre de una tarea (FC163 F2B4 Sub-Batch 4B-2). */
const EvidenceInput: React.FC<EvidenceInputProps> = ({
  urls,
  notes,
  onUrlsChange,
  onNotesChange,
}) => {
  const addUrl = (): void => onUrlsChange([...urls, '']);
  const removeUrl = (idx: number): void => onUrlsChange(urls.filter((_, i) => i !== idx));
  const updateUrl = (idx: number, val: string): void =>
    onUrlsChange(urls.map((u, i) => (i === idx ? val : u)));

  return (
    <div className="mt-3 p-3 border border-slate-200 rounded-[4px] bg-slate-50 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f2a44]/60">
        Evidencias (URLs)
      </p>
      {urls.map((url, idx) => (
        <EvidenceUrlRow key={idx} url={url} idx={idx} onUpdate={updateUrl} onRemove={removeUrl} />
      ))}
      <button
        type="button"
        onClick={addUrl}
        data-testid="add-evidence-url-btn"
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#0f2a44]/50 hover:text-[#0f2a44] transition-colors"
      >
        <Plus size={12} />
        Agregar URL
      </button>
      <textarea
        placeholder="Notas de evidencia (opcional)"
        value={notes}
        onChange={(e): void => onNotesChange(e.target.value)}
        rows={2}
        data-testid="evidence-notes-input"
        className="w-full px-3 py-2 text-sm font-medium text-[#0f2a44] border border-slate-200 rounded-[4px] bg-white focus:outline-none focus:border-[#10b981]/50 resize-none"
      />
    </div>
  );
};

export default EvidenceInput;
